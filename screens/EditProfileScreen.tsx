import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL, UPLOADS_BASE_URL } from '../api';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ImagePlus, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext'; // <-- NUEVO

type PickedAsset = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { notifyAvatarUpdated } = useProfile(); // <-- NUEVO
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [foto, setFoto] = useState('');         // URL pública actual en BD
  const [fotoBase, setFotoBase] = useState(''); // preview local
  const [picked, setPicked] = useState<PickedAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    setLoading(true);
    console.log('[EditProfile] Cargar perfil...');
    try {
      const userId = await AsyncStorage.getItem('userId');
      console.log('[EditProfile] userId:', userId);
      if (!userId) {
        Alert.alert('Error', 'No se encontró el ID del usuario');
        navigation.goBack();
        return;
      }
      const url = `${AUTH_BASE_URL}/${userId}`;
      console.log('[EditProfile] GET perfil URL:', url);
      const res = await fetch(url);
      const status = res.status;
      const raw = await res.text();
      console.log('[EditProfile] GET perfil status:', status);

      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.log('[EditProfile] Error parseando JSON de perfil. raw:', raw?.slice(0, 400));
        throw new Error('Respuesta del servidor no es JSON');
      }

      if (!res.ok || !data?.nombre) {
        const msg = data?.error || 'Error al obtener el perfil';
        console.log('[EditProfile] Error lógico:', msg);
        Alert.alert('Error', msg);
        navigation.goBack();
        return;
      }

      console.log('[EditProfile] Perfil OK. Tiene foto_url:', !!data.foto_url);
      setNombre(data.nombre);
      setCorreo(data.correo);
      setTelefono(data.telefono);
      setNumeroCasa(data.numero_casa);
      setFoto(data.foto_url || '');
      setFotoBase('');
      setPicked(null);
    } catch (err: any) {
      console.log('[EditProfile] Catch cargarPerfil:', err?.message || err);
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
      navigation.goBack();
    } finally {
      setLoading(false);
      console.log('[EditProfile] cargarPerfil finalizado.');
    }
  };

  const seleccionarImagen = async () => {
    console.log('[EditProfile] Seleccionar imagen...');
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso denegado', 'Se requiere acceso a la galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // deprecado pero funcional; si molesta el warning, lo cambiamos luego
      quality: 0.7,
      allowsEditing: true,
    });

    console.log('[EditProfile] Resultado picker:', JSON.stringify(result));
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setFotoBase(asset.uri);
      setPicked({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg', // default amigable
        fileName: asset.fileName || null,
      });
      console.log('[EditProfile] Imagen elegida:', asset.uri, asset.mimeType, asset.fileName);
    }
  };

  async function fileUriToBlobWithFallback(fileUri: string, mime: string): Promise<Blob> {
    // 1) Intento directo con fetch(file://...)
    try {
      console.log('[EditProfile] Intentando blob con fetch(fileUri)...');
      const resp = await fetch(fileUri);
      const blob = await resp.blob();
      // @ts-ignore
      console.log('[EditProfile] OK fetch(fileUri). blob size:', blob?.size);
      return blob;
    } catch (e: any) {
      console.log('[EditProfile] fetch(fileUri) falló:', e?.message || e);
    }

    // 2) Fallback: base64 -> data: -> blob()
    console.log('[EditProfile] Fallback a base64 -> data: URI -> blob()');
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) throw new Error('Archivo no existe en: ' + fileUri);

    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('[EditProfile] base64 length (fallback):', base64Data?.length);

    const blob = await (await fetch(`data:${mime};base64,${base64Data}`)).blob();
    // @ts-ignore
    console.log('[EditProfile] OK fallback data:. blob size:', blob?.size);
    return blob;
  }

  const uploadAvatarWithSignedUrl = async (
    userId: string,
    asset: PickedAsset
  ): Promise<string | null> => {
    console.log('[EditProfile] uploadAvatarWithSignedUrl INICIO...');
    try {
      const uri = asset.uri;
      const mime = asset.mimeType || 'image/jpeg';
      const guessedExt =
        (asset.fileName && asset.fileName.split('.').pop()) ||
        (uri.includes('.') ? uri.split('.').pop() : '') ||
        'jpg';
      const fileExt = (guessedExt || 'jpg').toLowerCase();
      const fileName = `${userId}-avatar-${Date.now()}.${fileExt}`;

      const fileUri = uri.startsWith('file://') ? uri : 'file://' + uri;
      const info = await FileSystem.getInfoAsync(fileUri);
      console.log('[EditProfile] File info:', info);
      if (!info.exists) {
        const msg = `Archivo no existe en: ${fileUri}`;
        console.log('[EditProfile] ' + msg);
        Alert.alert('Error', msg);
        return null;
      }

      console.log('[EditProfile] Solicitando Signed URL a backend:', `${UPLOADS_BASE_URL}/signed-url`);
      const signedRes = await fetch(`${UPLOADS_BASE_URL}/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          contentType: mime,
          bucket: 'avatars',
        }),
      });

      const signedText = await signedRes.text();
      let signedData: any = null;
      try {
        signedData = JSON.parse(signedText);
      } catch (e) {
        console.log('[EditProfile] Respuesta NO-JSON de signed-url:', signedText?.slice(0, 400));
        Alert.alert('Error', 'Respuesta inválida del servidor al firmar subida');
        return null;
      }

      console.log('[EditProfile] signed-url status:', signedRes.status, 'data:', signedData);
      if (!signedRes.ok) {
        const msg = signedData?.error || `SignedURL error status ${signedRes.status}`;
        console.log('[EditProfile] Error al pedir signed-url:', msg);
        Alert.alert('Error', msg);
        return null;
      }

      const { signedUrl, publicUrl } = signedData || {};
      if (!signedUrl) {
        console.log('[EditProfile] signedUrl ausente en respuesta:', signedData);
        Alert.alert('Error', 'No se recibió URL firmada para subir');
        return null;
      }
      console.log('[EditProfile] Signed URL OK. publicUrl:', publicUrl);

      console.log('[EditProfile] Creando blob (con fallback) desde fileUri...');
      let blob: Blob;
      try {
        blob = await fileUriToBlobWithFallback(fileUri, mime);
      } catch (e: any) {
        console.log('[EditProfile] Error creando blob con fallback:', e?.message || e);
        Alert.alert('Error', 'No se pudo preparar la imagen para subir (blob)');
        return null;
      }

      console.log('[EditProfile] Subiendo con PUT al signedUrl...');
      let putRes: Response;
      try {
        putRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': mime,
            'x-upsert': 'true',
          },
          // @ts-ignore
          body: blob,
        });
      } catch (e: any) {
        console.log('[EditProfile] PUT lanzó excepción:', e?.message || e);
        Alert.alert('Error', `PUT a Supabase falló: ${e?.message || 'desconocido'}`);
        return null;
      }

      const putBody = await putRes.text();
      console.log('[EditProfile] PUT status:', putRes.status, 'body:', putBody?.slice(0, 400));
      if (!putRes.ok) {
        Alert.alert('Error', `No se pudo subir la imagen (status ${putRes.status})`);
        return null;
      }

      console.log('[EditProfile] Subida OK. publicUrl:', publicUrl);
      return publicUrl || null;
    } catch (err: any) {
      console.log('[EditProfile] Catch uploadAvatarWithSignedUrl:', err?.message || err);
      Alert.alert('Error', `Fallo al subir la imagen: ${err?.message || 'desconocido'}`);
      return null;
    }
  };

  const guardarCambios = async () => {
    if (!nombre || !correo) {
      Alert.alert('Error', 'Completa los campos obligatorios');
      return;
    }
    setLoading(true);
    console.log('[EditProfile] Guardar cambios...');
    try {
      const userId = await AsyncStorage.getItem('userId');
      console.log('[EditProfile] userId para guardar:', userId);
      if (!userId) {
        Alert.alert('Error', 'ID no disponible');
        setLoading(false);
        return;
      }

      // Subir nueva imagen si se seleccionó
      let foto_url = foto;
      if (picked?.uri) {
        setUploading(true);
        console.log('[EditProfile] Subiendo avatar con Signed URL...');
        const uploaded = await uploadAvatarWithSignedUrl(userId, picked);
        setUploading(false);

        if (!uploaded) {
          console.log('[EditProfile] Upload avatar falló, abortando guardado.');
          setLoading(false);
          return;
        }
        foto_url = uploaded;
        setFoto(uploaded);
        setFotoBase('');
        setPicked(null);
      }

      const payload = {
        nombre,
        correo,
        telefono,
        numero_casa: numeroCasa,
        foto_url,
      };

      const url = `${AUTH_BASE_URL}/update/${userId}`;
      console.log('[EditProfile] PUT perfil URL:', url, 'payload:', payload);
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.log('[EditProfile] Respuesta no-JSON en guardar:', text?.slice(0, 400));
      }

      console.log('[EditProfile] PUT perfil status:', res.status, 'data:', data);
      if (!res.ok) {
        const msg = data?.error || `No se pudo actualizar (status ${res.status})`;
        console.log('[EditProfile] Error lógica al guardar:', msg);
        Alert.alert('Error', msg);
        setLoading(false);
        return;
      }

      // 🔥 Notificar a toda la app que el avatar cambió (refirma URL y rompe caché global)
      await notifyAvatarUpdated(); // <-- NUEVO

      console.log('[EditProfile] Perfil actualizado OK.');
      Alert.alert('Éxito', 'Perfil actualizado', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.log('[EditProfile] Catch guardarCambios:', err?.message || err);
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
      console.log('[EditProfile] guardarCambios finalizado.');
    }
  };

  const limpiarImagenSeleccionada = () => {
    console.log('[EditProfile] Limpiar imagen seleccionada (cancelar cambio de avatar)');
    setFotoBase('');
    setPicked(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ArrowLeft color={theme.colors.primary} size={28} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.colors.primary }]}>Editar Perfil</Text>

      <View style={styles.avatarWrap}>
        <TouchableOpacity style={styles.avatarContainer} onPress={seleccionarImagen} activeOpacity={0.8}>
          <Image
            source={
              fotoBase
                ? { uri: fotoBase }
                : foto
                ? { uri: foto }
                : require('../assets/default-profile.png')
            }
            style={styles.avatar}
          />
          <View style={styles.avatarEdit}>
            <ImagePlus color="#fff" size={22} />
          </View>
        </TouchableOpacity>
        {fotoBase ? (
          <TouchableOpacity style={styles.clearThumb} onPress={limpiarImagenSeleccionada}>
            <X color="#fff" size={16} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TextInput
        style={[styles.input]}
        value={nombre}
        onChangeText={setNombre}
        placeholder="Nombre"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input]}
        value={correo}
        onChangeText={setCorreo}
        placeholder="Correo"
        keyboardType="email-address"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input]}
        value={telefono}
        onChangeText={setTelefono}
        placeholder="Teléfono"
        keyboardType="phone-pad"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input]}
        value={numeroCasa}
        onChangeText={setNumeroCasa}
        placeholder="Número de casa"
        placeholderTextColor={theme.colors.placeholder}
      />

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
        onPress={guardarCambios}
        disabled={uploading || loading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Guardar cambios</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, alignItems: 'center' },
  backButton: { position: 'absolute', top: 32, left: 12, zIndex: 2 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 24, marginBottom: 16 },
  avatarWrap: { alignItems: 'center', marginTop: 8, marginBottom: 18 },
  avatarContainer: { alignSelf: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee' },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#888',
    borderRadius: 16,
    padding: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  clearThumb: {
    position: 'absolute',
    top: -6,
    right: (100 / 2) - 6,
    backgroundColor: '#00000088',
    borderRadius: 12,
    padding: 4,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 14,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    color: '#000',
    width: '100%',
    fontSize: 16,
  },
  saveButton: { padding: 14, borderRadius: 10, marginTop: 20, width: '100%' },
  saveButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
