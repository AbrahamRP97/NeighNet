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
import { useProfile } from '../context/ProfileContext';

type PickedAsset = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { notifyAvatarUpdated } = useProfile();
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
    try {
      const [userId, token] = await Promise.all([
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('token'),
      ]);
      if (!userId) {
        Alert.alert('Error', 'No se encontró el ID del usuario');
        navigation.goBack();
        return;
      }
      const url = `${AUTH_BASE_URL}/${userId}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const status = res.status;
      const raw = await res.text();

      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error('Respuesta del servidor no es JSON');
      }

      if (!res.ok || !data?.nombre) {
        const msg = data?.error || `Error al obtener el perfil (status ${status})`;
        Alert.alert('Error', msg);
        navigation.goBack();
        return;
      }

      setNombre(data.nombre);
      setCorreo(data.correo);
      setTelefono(data.telefono);
      setNumeroCasa(data.numero_casa);
      setFoto(data.foto_url || '');
      setFotoBase('');
      setPicked(null);
    } catch (err: any) {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const seleccionarImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso denegado', 'Se requiere acceso a la galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setFotoBase(asset.uri);
      setPicked({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || null,
      });
    }
  };

  async function fileUriToBlobWithFallback(fileUri: string, mime: string): Promise<Blob> {
    try {
      const resp = await fetch(fileUri);
      const blob = await resp.blob();
      return blob;
    } catch {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) throw new Error('Archivo no existe en: ' + fileUri);
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const blob = await (await fetch(`data:${mime};base64,${base64Data}`)).blob();
      return blob;
    }
  }

  const uploadAvatarWithSignedUrl = async (
    userId: string,
    asset: PickedAsset
  ): Promise<string | null> => {
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
      if (!info.exists) {
        Alert.alert('Error', `Archivo no existe en: ${fileUri}`);
        return null;
      }

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
        signedData = signedText ? JSON.parse(signedText) : null;
      } catch {
        Alert.alert('Error', 'Respuesta inválida del servidor al firmar subida');
        return null;
      }

      if (!signedRes.ok) {
        const msg = signedData?.error || `SignedURL error status ${signedRes.status}`;
        Alert.alert('Error', msg);
        return null;
      }

      const { signedUrl, publicUrl } = signedData || {};
      if (!signedUrl) {
        Alert.alert('Error', 'No se recibió URL firmada para subir');
        return null;
      }

      const blob = await fileUriToBlobWithFallback(fileUri, mime);

      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mime,
          'x-upsert': 'true',
        },
        // @ts-ignore
        body: blob,
      });

      if (!putRes.ok) {
        Alert.alert('Error', `No se pudo subir la imagen (status ${putRes.status})`);
        return null;
      }

      return publicUrl || null;
    } catch (err: any) {
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
    try {
      const [userId, token] = await Promise.all([
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('token'),
      ]);
      if (!userId) {
        Alert.alert('Error', 'ID no disponible');
        setLoading(false);
        return;
      }

      let foto_url = foto;
      if (picked?.uri) {
        setUploading(true);
        const uploaded = await uploadAvatarWithSignedUrl(userId, picked);
        setUploading(false);

        if (!uploaded) {
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
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // puede venir vacío
      }

      if (!res.ok) {
        const msg = data?.error || `No se pudo actualizar (status ${res.status})`;
        Alert.alert('Error', msg);
        setLoading(false);
        return;
      }

      await notifyAvatarUpdated();
      Alert.alert('Éxito', 'Perfil actualizado', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  const limpiarImagenSeleccionada = () => {
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
