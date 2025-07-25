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
import { AUTH_BASE_URL } from '../api';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ImagePlus } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [foto, setFoto] = useState('');
  const [fotoBase, setFotoBase] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'No se encontró el ID del usuario');
        navigation.goBack();
        return;
      }
      const res = await fetch(`${AUTH_BASE_URL}/${userId}`);
      const text = await res.text();
      const data = JSON.parse(text);
      if (!res.ok || !data.nombre) {
        Alert.alert('Error', data?.error || 'Error al obtener el perfil');
        navigation.goBack();
        return;
      }
      setNombre(data.nombre);
      setCorreo(data.correo);
      setTelefono(data.telefono);
      setNumeroCasa(data.numero_casa);
      setFoto(data.foto_url || '');
      setFotoBase('');
    } catch {
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
      const localUri = result.assets[0].uri;
      setFotoBase(localUri);

      setUploading(true);
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          Alert.alert('Error', 'No se encontró el ID del usuario');
          setUploading(false);
          setFotoBase('');
          return;
        }

        // Obtiene la extensión y el tipo de contenido
        const match = /\.(\w+)$/.exec(localUri);
        const fileExt = match ? match[1].toLowerCase() : 'jpg';
        const contentType =
          result.assets[0].mimeType ||
          (fileExt === 'png'
            ? 'image/png'
            : fileExt === 'jpeg' || fileExt === 'jpg'
            ? 'image/jpeg'
            : 'application/octet-stream');
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        // Convierte la URI local a blob
        let response = await fetch(localUri);
        let blob = await response.blob();

        // Sube la imagen al bucket "avatars"
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          Alert.alert('Error', `No se pudo subir la imagen: ${uploadError.message}`);
          setUploading(false);
          setFotoBase('');
          return;
        }

        // Obtiene la URL pública
        const { data: publicData } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(fileName);

        if (publicData?.publicUrl) {
          setFoto(publicData.publicUrl);
        } else {
          Alert.alert('Error', 'No se pudo obtener la URL pública de la imagen');
          setFotoBase('');
        }
      } catch (err) {
        Alert.alert('Error', 'Fallo inesperado al subir');
        setFotoBase('');
      }
      setUploading(false);
    }
  };

  const guardarCambios = async () => {
    if (!nombre || !correo) {
      Alert.alert('Error', 'Completa los campos obligatorios');
      return;
    }
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'ID no disponible');
        setLoading(false);
        return;
      }
      const payload = {
        nombre,
        correo,
        telefono,
        numero_casa: numeroCasa,
        foto_url: foto,
      };
      const res = await fetch(`${AUTH_BASE_URL}/update/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = JSON.parse(text);
      if (!res.ok) {
        Alert.alert('Error', data?.error || 'No se pudo actualizar');
        return;
      }
      Alert.alert('Éxito', 'Perfil actualizado');
      navigation.goBack();
    } catch {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ArrowLeft color={theme.colors.primary} size={28} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.colors.primary }]}>Editar Perfil</Text>

      <TouchableOpacity style={styles.avatarContainer} onPress={seleccionarImagen}>
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
        <Text style={styles.saveButtonText}>
          {uploading ? 'Subiendo imagen...' : 'Guardar cambios'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 32,
    left: 12,
    zIndex: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 18,
    marginTop: 18,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eee',
  },
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
  saveButton: {
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    width: '100%',
  },
  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
