import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { POSTS_BASE_URL } from '../api';

interface Props {
  userName: string;
}

interface Post {
  id: string;
  mensaje: string;
  imagen_url: string;
  created_at: string;
  usuarios: {
    nombre: string;
    foto_url: string;
  };
}

export default function HomeScreen({ userName }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [imagen, setImagen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    obtenerPosts();
  }, []);

  const obtenerPosts = async () => {
    try {
      const res = await fetch(`${POSTS_BASE_URL}`);
      const data = await res.json();
      setPosts(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las publicaciones');
    }
  };

  const seleccionarImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a las fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImagen(result.assets[0].uri);
    }
  };

  const publicar = async () => {
    if (!mensaje.trim()) {
      Alert.alert('Escribe un mensaje para publicar');
      return;
    }

    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      Alert.alert('Error de sesión');
      return;
    }

    try {
      setLoading(true);

      // En esta demo, usamos imagen_url como URI local (no se sube a servidor)
      const response = await fetch(`${POSTS_BASE_URL}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          mensaje,
          imagen_url: null,
        }),
      });

      if (!response.ok) {
       const errroData = await response.json();
       Alert.alert('Error al publicar', errroData.message || 'Error desconocido');
       setLoading(false);
       return;
      }

      const data = await response.json();
      setMensaje('');
      setImagen(null);
      obtenerPosts();
    } catch (error) {
      Alert.alert('Error al publicar');
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buen día';
    if (hour < 18) return 'Buena tarde';
    return 'Buena noche';
  };

  const renderItem = ({ item }: { item: Post }) => (
    <View style={styles.post}>
      <View style={styles.userInfo}>
        {item.usuarios?.foto_url ? (
          <Image source={{ uri: item.usuarios.foto_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <Text style={styles.username}>{item.usuarios?.nombre || 'Usuario'}</Text>
      </View>
      <Text style={styles.message}>{item.mensaje}</Text>
      {item.imagen_url ? (
        <Image source={{ uri: item.imagen_url }} style={styles.postImage} />
      ) : null}
      <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleString()}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.header}>{getGreeting()}, {userName} 👋</Text>

      <View style={styles.newPost}>
        <TextInput
          placeholder="¿Qué quieres compartir hoy?"
          value={mensaje}
          onChangeText={setMensaje}
          style={styles.input}
          multiline
        />
        <TouchableOpacity onPress={seleccionarImagen} style={styles.imageButton}>
          <Text style={styles.imageButtonText}>📷 Imagen</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={publicar} style={styles.publishButton} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.publishButtonText}>Publicar</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.postList}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 14,
    color: '#1e3a8a',
    textAlign: 'center',
  },
  newPost: {
    marginBottom: 18,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  input: {
    minHeight: 70,
    padding: 12,
    backgroundColor: '#e6f0fa',
    borderRadius: 10,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 12,
  },
  imageButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  imageButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  publishButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  postList: {
    paddingBottom: 100,
  },
  post: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#cbd5e1',
    marginRight: 12,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#1e293b',
  },
  message: {
    fontSize: 15,
    marginBottom: 8,
    color: '#374151',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
});
