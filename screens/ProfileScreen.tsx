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
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL } from '../api';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { LogOut, Pencil, X as CloseIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';

export default function ProfileScreen() {
  const { theme, themeType, toggleTheme } = useTheme();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [foto, setFoto] = useState('');
  const [fotoBase, setFotoBase] = useState(''); // uri local mientras sube
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation<any>();

  const cargarPerfil = async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'No se encontró el ID del usuario');
        return;
      }
      const res = await fetch(`${AUTH_BASE_URL}/${userId}`);
      const text = await res.text();
      const data = JSON.parse(text);
      if (!res.ok || !data.nombre) {
        Alert.alert('Error', data?.error || 'Error al obtener el perfil');
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPerfil();
  }, []);

  // Subida a Supabase Storage + actualización de foto_url en backend
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
      setFotoBase(localUri); // Muestra la nueva foto aunque no se suba aún

      setUploading(true);
      try {
        // SUBIR a Supabase Storage
        const fileExt = localUri.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const response = await fetch(localUri);
        const blob = await response.blob();

        // Sube a bucket 'avatars'
        const { error } = await supabase
          .storage
          .from('avatars')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (error) {
          Alert.alert('Error', 'No se pudo subir la imagen');
          setUploading(false);
          setFotoBase('');
          return;
        }

        // Obtiene URL pública
        const { data: publicUrlData } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(fileName);

        const publicUrl = publicUrlData?.publicUrl;
        if (publicUrl) {
          setFoto(publicUrl); // Usa esta url para guardar en backend luego
        } else {
          Alert.alert('Error', 'No se pudo obtener la URL pública');
          setFotoBase('');
        }
      } catch {
        Alert.alert('Error', 'Error al subir la imagen');
        setFotoBase('');
      }
      setUploading(false);
    }
  };

  const guardarCambios = async () => {
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
        foto_url: foto, // <-- Aquí SIEMPRE se manda la URL pública de Supabase
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
      setEditando(false);
      cargarPerfil();
    } catch {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    }
    setLoading(false);
  };

  const cerrarSesion = async () => {
    await AsyncStorage.clear();
    navigation.getParent()?.replace('Login');
  };

  if (loading) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ShimmerPlaceHolder
          LinearGradient={LinearGradient}
          style={styles.skeletonAvatar}
        />
        <ShimmerPlaceHolder
          LinearGradient={LinearGradient}
          style={styles.skeletonLine}
        />
        <ShimmerPlaceHolder
          LinearGradient={LinearGradient}
          style={styles.skeletonLine}
        />
        <ShimmerPlaceHolder
          LinearGradient={LinearGradient}
          style={styles.skeletonLine}
        />
        <ShimmerPlaceHolder
          LinearGradient={LinearGradient}
          style={styles.skeletonLine}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={styles.toggleContainer}>
        <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
          Tema oscuro
        </Text>
        <Switch
          value={themeType === 'dark'}
          onValueChange={toggleTheme}
          trackColor={{
            false: theme.colors.placeholder,
            true: theme.colors.primary,
          }}
          thumbColor={theme.colors.card}
        />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={cerrarSesion}>
          <LogOut color="red" size={24} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (editando) {
              setEditando(false);
              cargarPerfil();
            } else {
              setEditando(true);
            }
          }}
        >
          {editando ? (
            <CloseIcon color={theme.colors.primary} size={24} />
          ) : (
            <Pencil color={theme.colors.primary} size={24} />
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: theme.colors.primary }]}>
        👤 Perfil
      </Text>

      <TouchableOpacity onPress={editando && !uploading ? seleccionarImagen : undefined}>
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
        {editando && (
          <Text style={[styles.editPhotoText, { color: theme.colors.primary }]}>
            {uploading ? 'Subiendo...' : 'Cambiar foto'}
          </Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        editable={editando}
        value={nombre}
        onChangeText={setNombre}
        placeholder="Nombre"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        editable={editando}
        value={correo}
        onChangeText={setCorreo}
        placeholder="Correo"
        keyboardType="email-address"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        editable={editando}
        value={telefono}
        onChangeText={setTelefono}
        placeholder="Teléfono"
        keyboardType="phone-pad"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        editable={editando}
        value={numeroCasa}
        onChangeText={setNumeroCasa}
        placeholder="Número de casa"
        placeholderTextColor={theme.colors.placeholder}
      />

      {editando && (
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={guardarCambios}
          disabled={uploading}
        >
          <Text style={styles.saveButtonText}>
            {uploading ? 'Subiendo imagen...' : 'Guardar cambios'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    marginRight: 8,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  editPhotoText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 13,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    color: '#000',
  },
  disabledInput: {
    backgroundColor: '#eee',
    color: '#777',
  },
  saveButton: {
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  skeletonAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 16,
  },
  skeletonLine: {
    height: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
});
