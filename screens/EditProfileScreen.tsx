import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Image, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL, UPLOADS_BASE_URL } from '../api';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ImagePlus, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../components/Card';
import { withHaptics, success, warning, tap, error as hError } from '../utils/Haptics';

type PickedAsset = { uri: string; mimeType?: string | null; fileName?: string | null; };

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { notifyAvatarUpdated } = useProfile();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [foto, setFoto] = useState('');
  const [fotoBase, setFotoBase] = useState('');
  const [picked, setPicked] = useState<PickedAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation<any>();

  const getAuthOrFail = async () => {
    const [userId, token] = await Promise.all([AsyncStorage.getItem('userId'), AsyncStorage.getItem('token')]);
    if (!userId || !token) {
      Alert.alert('Sesión requerida','No se encontró un token de sesión. Inicia sesión nuevamente.',
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }]);
      throw new Error('MISSING_AUTH');
    }
    return { userId, token };
  };

  useEffect(() => { cargarPerfil(); }, []);

  const cargarPerfil = async () => {
    setLoading(true);
    try {
      const { userId, token } = await getAuthOrFail();
      const res = await fetch(`${AUTH_BASE_URL}/${userId}`, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      const raw = await res.text(); const data = raw ? JSON.parse(raw) : null;
      if (!res.ok || !data?.nombre) {
        Alert.alert('Error', data?.error || `Error al obtener el perfil (status ${res.status})`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
        return;
      }
      setNombre(data.nombre); setCorreo(data.correo); setTelefono(data.telefono);
      setNumeroCasa(data.numero_casa); setFoto(data.foto_url || ''); setFotoBase(''); setPicked(null);
    } catch (err: any) {
      if (err?.message !== 'MISSING_AUTH') {
        Alert.alert('Error de red','No se pudo conectar al servidor',[{ text:'OK', onPress: () => navigation.goBack() }]);
      }
    } finally { setLoading(false); }
  };

  const seleccionarImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { Alert.alert('Permiso denegado', 'Se requiere acceso a la galería'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setFotoBase(asset.uri);
      setPicked({ uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', fileName: asset.fileName || null });
    }
  };

  async function fileUriToBlobWithFallback(fileUri: string, mime: string): Promise<Blob> {
    try { return await (await fetch(fileUri)).blob(); }
    catch {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) throw new Error('Archivo no existe en: ' + fileUri);
      const base64Data = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
      return await (await fetch(`data:${mime};base64,${base64Data}`)).blob();
    }
  }

  const uploadAvatarWithSignedUrl = async (userId: string, asset: PickedAsset): Promise<string | null> => {
    try {
      const uri = asset.uri; const mime = asset.mimeType || 'image/jpeg';
      const guessedExt = (asset.fileName && asset.fileName.split('.').pop()) || (uri.includes('.') ? uri.split('.').pop() : '') || 'jpg';
      const fileExt = (guessedExt || 'jpg').toLowerCase();
      const fileName = `${userId}-avatar-${Date.now()}.${fileExt}`;
      const fileUri = uri.startsWith('file://') ? uri : 'file://' + uri;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) { Alert.alert('Error', `Archivo no existe en: ${fileUri}`); return null; }

      const token = await AsyncStorage.getItem('token');
      const signedRes = await fetch(`${UPLOADS_BASE_URL}/signed-url`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ fileName, contentType: mime, bucket: 'avatars' }),
      });
      const signedText = await signedRes.text(); const signedData = signedText ? JSON.parse(signedText) : null;
      if (!signedRes.ok) { Alert.alert('Error', signedData?.error || `SignedURL error status ${signedRes.status}`); return null; }
      const { signedUrl, publicUrl } = signedData || {}; if (!signedUrl) { Alert.alert('Error','No se recibió URL firmada para subir'); return null; }

      const blob = await fileUriToBlobWithFallback(fileUri, mime);
      const putRes = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': mime, 'x-upsert': 'true' }, body: blob as any });
      if (!putRes.ok) { Alert.alert('Error', `No se pudo subir la imagen (status ${putRes.status})`); return null; }
      return publicUrl || null;
    } catch (err: any) { Alert.alert('Error', `Fallo al subir la imagen: ${err?.message || 'desconocido'}`); return null; }
  };

  const guardarCambios = async () => {
    if (!nombre || !correo) { warning(); Alert.alert('Error','Completa los campos obligatorios'); return; }
    setLoading(true);
    try {
      const { userId, token } = await getAuthOrFail();
      let foto_url = foto;
      if (picked?.uri) {
        setUploading(true);
        const uploaded = await uploadAvatarWithSignedUrl(userId, picked);
        setUploading(false);
        if (!uploaded) { hError(); setLoading(false); return; }
        foto_url = uploaded; setFoto(uploaded); setFotoBase(''); setPicked(null);
      }
      const payload = { nombre, correo, telefono, numero_casa: numeroCasa, foto_url };
      const res = await fetch(`${AUTH_BASE_URL}/update/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
      });
      const text = await res.text(); let data: any = null; try { data = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) { Alert.alert('Error', data?.error || `No se pudo actualizar (status ${res.status})`); hError(); setLoading(false); return; }
      await notifyAvatarUpdated();
      success();
      Alert.alert('Éxito','Perfil actualizado',[{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      if (err?.message !== 'MISSING_AUTH') Alert.alert('Error de red','No se pudo conectar al servidor');
      hError();
    } finally { setLoading(false); }
  };

  const quitarFotoPerfil = async () => {
    warning();
    Alert.alert('Quitar foto','¿Deseas eliminar tu foto de perfil?',
      [{ text:'Cancelar', style:'cancel' },
       { text:'Eliminar', style:'destructive',
         onPress: async () => {
           try {
             const { userId, token } = await getAuthOrFail();
             const res = await fetch(`${AUTH_BASE_URL}/update/${userId}`, {
               method:'PUT', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
               body: JSON.stringify({ nombre, correo, telefono, numero_casa: numeroCasa, remove_avatar: true, foto_url: '' }),
             });
             const txt = await res.text(); let data:any = null; try { data = txt ? JSON.parse(txt) : null; } catch {}
             if (!res.ok) { Alert.alert('Error', data?.error || `No se pudo actualizar (status ${res.status})`); hError(); return; }
             setFoto(''); setFotoBase(''); setPicked(null); await notifyAvatarUpdated();
             success();
             Alert.alert('Listo','Se quitó tu foto de perfil.');
           } catch (e:any) {
             if (e?.message !== 'MISSING_AUTH') Alert.alert('Error de red','No se pudo conectar al servidor');
           }
         } }]);
  };

  const limpiarImagenSeleccionada = () => { tap(); setFotoBase(''); setPicked(null); };

  if (loading) {
    return (<View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);
  }

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding:24 }}>
        {/* Banner */}
        <LinearGradient colors={[theme.colors.primary, theme.colors.accent]} start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={styles.banner}>
          <View style={styles.bannerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.bannerBack}>
              <ArrowLeft color="#fff" size={22} />
            </TouchableOpacity>
            <Text style={styles.bannerTitle}>Editar perfil</Text>
            <View style={{ width: 22 }} />
          </View>
        </LinearGradient>

        {/* Card con avatar + formulario */}
        <Card style={{ padding: 18, borderRadius: 16 }}>
          <View style={styles.avatarWrap}>
            {(!fotoBase && !!foto) ? (
              <TouchableOpacity style={styles.removeButton} onPress={quitarFotoPerfil} disabled={uploading}>
                <Text style={[styles.removeButtonText, { color: '#e33' }]}>Quitar foto de perfil</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.avatarContainer} onPress={seleccionarImagen} activeOpacity={0.8}>
              <Image
                source={ fotoBase ? { uri: fotoBase } : (foto ? { uri: foto } : require('../assets/default-profile.png')) }
                style={[styles.avatar, { backgroundColor: theme.colors.placeholder }]}
              />
              <View style={[styles.avatarEdit, { backgroundColor: theme.colors.primary }]}>
                <ImagePlus color="#fff" size={20} />
              </View>
            </TouchableOpacity>

            {fotoBase ? (
              <TouchableOpacity style={styles.clearThumb} onPress={limpiarImagenSeleccionada}>
                <X color="#fff" size={16} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Inputs dentro de Card, tematizados */}
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.placeholder, color: theme.colors.text }]}
            value={nombre} onChangeText={setNombre} placeholder="Nombre" placeholderTextColor={theme.colors.placeholder}
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.placeholder, color: theme.colors.text }]}
            value={correo} onChangeText={setCorreo} placeholder="Correo" keyboardType="email-address" placeholderTextColor={theme.colors.placeholder}
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.placeholder, color: theme.colors.text }]}
            value={telefono} onChangeText={setTelefono} placeholder="Teléfono" keyboardType="phone-pad" placeholderTextColor={theme.colors.placeholder}
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.placeholder, color: theme.colors.text }]}
            value={numeroCasa} onChangeText={setNumeroCasa} placeholder="Número de casa" placeholderTextColor={theme.colors.placeholder}
          />

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: uploading ? 0.7 : 1 }]}
            onPress={withHaptics(guardarCambios, 'tap')} disabled={uploading || loading}
          >
            {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  banner:{ borderRadius:20, paddingVertical:18, paddingHorizontal:16, marginBottom:16 },
  bannerRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  bannerTitle:{ color:'#fff', fontSize:20, fontWeight:'800' },

  bannerBack:{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)' },

  avatarWrap:{ alignItems:'center', marginBottom:14 },
  avatarContainer:{ alignSelf:'center' },
  avatar:{ width:100, height:100, borderRadius:50 },
  avatarEdit:{ position:'absolute', bottom:0, right:0, borderRadius:16, padding:6, borderWidth:2, borderColor:'#fff' },

  removeButton:{ paddingVertical:10, paddingHorizontal:14, borderRadius:8, borderWidth:1, borderColor:'#e33', alignSelf:'stretch', marginBottom:10 },
  removeButtonText:{ textAlign:'center', fontWeight:'bold' },

  clearThumb:{ position:'absolute', top:-6, right:(100/2)-6, backgroundColor:'#00000088', borderRadius:12, padding:4 },

  input:{ padding:12, marginBottom:12, borderRadius:12, borderWidth:1, width:'100%', fontSize:16 },

  saveButton:{ padding:14, borderRadius:12, marginTop:8, width:'100%', alignItems:'center' },
  saveButtonText:{ color:'#fff', textAlign:'center', fontWeight:'bold', fontSize:16 },

  loadingContainer:{ flex:1, justifyContent:'center', alignItems:'center' },
});
