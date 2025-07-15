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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../components/CustomButton';
import { AUTH_BASE_URL } from '../api';

export default function ProfileScreen() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fotoURL, setFotoURL] = useState('');

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          Alert.alert('Error', 'No se pudo obtener el ID del usuario');
          return;
        }

        const response = await fetch(`${AUTH_BASE_URL}/${userId}`);
        const text = await response.text();

        try {
          const data = JSON.parse(text);

          if (!response.ok || !data || !data.nombre || !data.correo) {
            Alert.alert('Error', data?.error || 'No se pudo cargar el perfil');
            return;
          }

          setNombre(data.nombre);
          setCorreo(data.correo);
          setTelefono(data.telefono || '');
          setNumeroCasa(data.numero_casa || '');
          setFotoURL(data.foto_url || '');
        } catch {
          Alert.alert('Error', 'Respuesta inesperada del servidor');
        }
      } catch (error) {
        Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
      } finally {
        setLoading(false);
      }
    };

    cargarPerfil();
  }, []);

  const guardarCambios = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'No se pudo obtener el ID del usuario');
        return;
      }

      const payload = {
        nombre,
        correo,
        telefono,
        numero_casa: numeroCasa,
        foto_url: fotoURL,
      };

      const response = await fetch(`${AUTH_BASE_URL}/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await response.text();

      try {
        const data = JSON.parse(text);

        if (!response.ok) {
          Alert.alert('Error', data?.error || 'No se pudo actualizar el perfil');
          return;
        }

        Alert.alert('Éxito', 'Perfil actualizado correctamente');
        setEditando(false);
      } catch {
        Alert.alert('Error', 'Respuesta inesperada del servidor');
      }
    } catch (error) {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    }
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
      <Text style={styles.title}>👤 Perfil del usuario</Text>

      {fotoURL ? (
        <Image source={{ uri: fotoURL }} style={styles.avatar} />
      ) : (
        <Image
          source={require('../assets/default-profile.png')}
          style={styles.avatar}
        />
      )}

      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        value={nombre}
        editable={editando}
        onChangeText={setNombre}
        placeholder="Nombre completo"
      />
      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        value={correo}
        editable={editando}
        onChangeText={setCorreo}
        placeholder="Correo electrónico"
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        value={telefono}
        editable={editando}
        onChangeText={setTelefono}
        placeholder="Teléfono"
        keyboardType="phone-pad"
      />
      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        value={numeroCasa}
        editable={editando}
        onChangeText={setNumeroCasa}
        placeholder="Número de casa"
        keyboardType="default"
      />
      <TextInput
        style={[styles.input, !editando && styles.disabledInput]}
        value={fotoURL}
        editable={editando}
        onChangeText={setFotoURL}
        placeholder="URL de foto de perfil"
      />

      {editando ? (
        <>
          <CustomButton title="Guardar cambios" onPress={guardarCambios} />
          <CustomButton title="Cancelar" onPress={() => setEditando(false)} />
        </>
      ) : (
        <CustomButton title="Editar perfil ✏️" onPress={() => setEditando(true)} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f5faff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1e90ff',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#777',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
