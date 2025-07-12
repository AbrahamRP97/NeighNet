import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { AUTH_BASE_URL } from '../api';

interface Props {
  userName: string;
}

export default function ProfileScreen({ userName }: Props) {
  const navigation = useNavigation<any>();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [userId, setUserId] = useState('');
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const savedId = await AsyncStorage.getItem('userId');
      if (!savedId) return;

      setUserId(savedId);

      try {
        const response = await fetch(`${AUTH_BASE_URL}/${savedId}`);
        const data = await response.json();

        if (response.ok) {
          setNombre(data.nombre);
          setCorreo(data.correo);
          setTelefono(data.telefono || '');
          setNumeroCasa(data.numero_casa || '');
          setFotoUrl(data.foto_url || '');
        } else {
          console.log('Error al cargar perfil:', data.error);
        }
      } catch (error) {
        console.log('Error de conexión:', error);
      }
    };

    cargarDatos();
  }, []);

  const seleccionarFoto = async () => {
    Alert.alert(
      'Foto de perfil',
      'Elige una opción',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Tomar foto',
          onPress: async () => {
            const permiso = await ImagePicker.requestCameraPermissionsAsync();
            if (!permiso.granted) {
              Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara.');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 1,
            });

            if (!result.canceled) {
              setFotoUrl(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Seleccionar de galería',
          onPress: async () => {
            const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permiso.granted) {
              Alert.alert('Permiso requerido', 'Se necesita acceso a las fotos.');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 1,
            });

            if (!result.canceled) {
              setFotoUrl(result.assets[0].uri);
            }
          },
        },
      ]
    );
  };

  const handleGuardar = async () => {
    if (!userId) {
      Alert.alert('Error interno', 'No se pudo obtener tu ID de usuario');
      return;
    }

    try {
      const response = await fetch(`${AUTH_BASE_URL}/update/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          correo,
          telefono,
          numero_casa: numeroCasa,
          foto_url: fotoUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.error || 'No se pudo actualizar');
        return;
      }

      await AsyncStorage.setItem('userName', nombre);
      Alert.alert('Perfil actualizado con éxito');
      setEditando(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Error de conexión');
    }
  };

  const handleEliminarCuenta = async () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${AUTH_BASE_URL}/delete/${userId}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                const data = await response.json();
                Alert.alert('Error', data.error || 'No se pudo eliminar la cuenta');
                return;
              }

              await AsyncStorage.clear();
              Alert.alert('Cuenta eliminada');
              navigation.replace('Login');
            } catch (error) {
              console.error(error);
              Alert.alert('Error de conexión');
            }
          },
        },
      ]
    );
  };

  const handleCerrarSesion = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  const toggleEdit = () => setEditando(!editando);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Mi Perfil</Text>
        <View style={styles.iconRow}>
          <TouchableOpacity onPress={toggleEdit} style={styles.iconButton}>
            <Feather name={editando ? 'x' : 'edit'} size={24} color="#3498db" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCerrarSesion} style={styles.iconButton}>
            <Feather name="log-out" size={24} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={editando ? seleccionarFoto : undefined} style={styles.imageContainer}>
        <Image
          source={fotoUrl ? { uri: fotoUrl } : require('../assets/default-profile.png')}
          style={styles.image}
        />
        {editando && (
          <View style={styles.cameraIconOverlay}>
            <Feather name="camera" size={24} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      <CustomInput placeholder="Nombre" value={nombre} onChangeText={setNombre} editable={editando} />
      <CustomInput placeholder="Correo" value={correo} onChangeText={setCorreo} editable={editando} keyboardType="email-address" />
      <CustomInput placeholder="Teléfono" value={telefono} onChangeText={setTelefono} editable={editando} keyboardType="phone-pad" />
      <CustomInput placeholder="Número de casa" value={numeroCasa} onChangeText={setNumeroCasa} editable={editando} />

      {editando && <CustomButton title="Guardar cambios" onPress={handleGuardar} />}
      <CustomButton title="Actualizar contraseña" onPress={() => navigation.navigate('ForgotPassword')} />
      <CustomButton title="Eliminar cuenta" onPress={handleEliminarCuenta} />
      <CustomButton title="Volver" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fefefe',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  iconRow: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  imageContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#3498db',
    borderWidth: 2,
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3498db',
    borderRadius: 16,
    padding: 4,
  },
  changePhotoText: {
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
});
