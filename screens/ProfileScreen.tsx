import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL } from '../api';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { LogOut, Pencil, X as CloseIcon } from 'lucide-react-native';

export default function ProfileScreen() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [foto, setFoto] = useState('');
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<any>();

  // Función para cargar datos del perfil
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
      if (!res.ok || !data?.nombre) {
        Alert.alert('Error', data?.error || 'Error al obtener el perfil');
        return;
      }
      setNombre(data.nombre);
      setCorreo(data.correo);
      setTelefono(data.telefono);
      setNumeroCasa(data.numero_casa);
      setFoto(data.foto_url);
    } catch {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPerfil();
  }, []);

  const guardarCambios = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'ID no disponible');
        return;
      }
      const payload = { nombre, correo, telefono, numero_casa: numeroCasa, foto_url: foto };
      const res = await fetch(`${AUTH_BASE_URL}/${userId}`, {
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
    } catch {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
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
      setFoto(result.assets[0].uri);
    }
  };

  const cerrarSesion = async () => {
    await AsyncStorage.clear();
    navigation.getParent()?.replace('Login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        {/* Logout */}
        <TouchableOpacity onPress={cerrarSesion}>
          <LogOut color="red" size={24} />
        </TouchableOpacity>
        {/* Toggle editar / cancelar */}
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
          {editando ? <CloseIcon color="#0077b6" size={24} /> : <Pencil color="#0077b6" size={24} />}
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>👤 Perfil</Text>

      <TouchableOpacity onPress={editando ? seleccionarImagen : undefined}>
        <Image
          source={
            foto ? { uri: foto } : require('../assets/default-profile.png')
          }
          style={styles.avatar}
        />
        {editando && <Text style={styles.editPhotoText}>Cambiar foto</Text>}
      </TouchableOpacity>

      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        editable={editando}
        value={nombre}
        onChangeText={setNombre}
        placeholder="Nombre"
      />
      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        editable={editando}
        value={correo}
        onChangeText={setCorreo}
        placeholder="Correo"
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        editable={editando}
        value={telefono}
        onChangeText={setTelefono}
        placeholder="Teléfono"
        keyboardType="phone-pad"
      />
      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        editable={editando}
        value={numeroCasa}
        onChangeText={setNumeroCasa}
        placeholder="Número de casa"
      />

      {editando && (
        <TouchableOpacity style={styles.saveButton} onPress={guardarCambios}>
          <Text style={styles.saveButtonText}>Guardar cambios</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5faff', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1e90ff' },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 8 },
  editPhotoText: { textAlign: 'center', color: '#0077b6', marginBottom: 16, fontSize: 13 },
  input: { backgroundColor: '#fff', padding: 12, marginBottom: 12, borderRadius: 8, borderColor: '#ccc', borderWidth: 1 },
  disabledInput: { backgroundColor: '#eee', color: '#777' },
  saveButton: { backgroundColor: '#0077b6', padding: 14, borderRadius: 10, marginTop: 16 },
  saveButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});