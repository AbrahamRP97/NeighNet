import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { POSTS_BASE_URL } from '../api';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { RefreshCw } from 'lucide-react-native';

interface Props {
  userName: string;
}
interface Post {
  id: string;
  mensaje: string;
  imagen_url: string | null;
  created_at: string;
  usuarios: { nombre: string; foto_url: string | null };
}

export default function HomeScreen({ userName }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [imagen, setImagen] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const { theme: t } = useTheme();
  const styles = makeStyles(t);

  useEffect(() => {
    obtenerPosts();
  }, []);

  const obtenerPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`${POSTS_BASE_URL}`);
      const data = await res.json();
      setPosts(data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las publicaciones');
    } finally {
      setLoadingPosts(false);
    }
  };

  // Seleccionar imagen y guardar URI temporal
  const seleccionarImagen = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a las fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImagen(result.assets[0].uri);
    }
  };

  // Subir imagen a Supabase Storage
  const subirImagen = async (uri: string, userId: string) => {
    try {
      const match = /\.(\w+)$/.exec(uri);
      const fileExt = match ? match[1].toLowerCase() : 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      let contentType = 'application/octet-stream';
      if (fileExt === 'jpg' || fileExt === 'jpeg') contentType = 'image/jpeg';
      if (fileExt === 'png') contentType = 'image/png';
      if (fileExt === 'webp') contentType = 'image/webp';

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('posts')
        .upload(fileName, blob, {
          contentType,
          upsert: true,
          metadata: { owner: userId },
        });

      if (error) {
        Alert.alert('Error', `No se pudo subir la imagen: ${error.message}`);
        return null;
      }

      // Obtener URL pública
      const { data } = supabase
        .storage
        .from('posts')
        .getPublicUrl(fileName);

      return data?.publicUrl || null;
    } catch {
      Alert.alert('Error', 'Error inesperado al subir la imagen');
      return null;
    }
  };

  // Publicar post (con o sin imagen)
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

    setUploading(true);
    setLoadingPosts(true);
    let imagen_url = null;

    if (imagen) {
      imagen_url = await subirImagen(imagen, userId);
      if (!imagen_url) {
        setUploading(false);
        setLoadingPosts(false);
        return;
      }
    }

    try {
      await fetch(`${POSTS_BASE_URL}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          mensaje,
          imagen_url,
        }),
      });
      setMensaje('');
      setImagen(null);
      obtenerPosts();
    } catch {
      Alert.alert('Error al publicar');
    } finally {
      setUploading(false);
      setLoadingPosts(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buen día';
    if (h < 18) return 'Buena tarde';
    return 'Buena noche';
  };

  const renderItem = ({ item }: { item: Post }) => (
    <Card style={styles.post}>
      <View style={styles.userInfo}>
        {item.usuarios.foto_url ? (
          <Image source={{ uri: item.usuarios.foto_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <Text style={styles.username}>{item.usuarios.nombre}</Text>
      </View>
      <Text style={styles.message}>{item.mensaje}</Text>
      {item.imagen_url ? (
        <Image source={{ uri: item.imagen_url }} style={styles.postImage} />
      ) : null}
      <Text style={styles.timestamp}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </Card>
  );

  // Refrescar posts al hacer pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await obtenerPosts();
    setRefreshing(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Text style={styles.header}>{getGreeting()}, {userName}</Text>

      <Card style={styles.newPost}>
        <TextInput
          style={styles.input}
          placeholder="¿Qué estás pensando?"
          placeholderTextColor={t.colors.placeholder}
          multiline
          value={mensaje}
          onChangeText={setMensaje}
        />
        {imagen && (
          <Image source={{ uri: imagen }} style={styles.previewImage} />
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable
            onPress={seleccionarImagen}
            style={({ pressed }) => [
              styles.imageButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.imageButtonText, { color: t.colors.primary }]}>
              {imagen ? 'Cambiar imagen' : 'Agregar imagen'}
            </Text>
          </Pressable>
          <Pressable
            onPress={publicar}
            style={({ pressed }) => [
              styles.publishButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            disabled={uploading || loadingPosts}
          >
            {uploading || loadingPosts ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.publishButtonText}>Publicar</Text>
            )}
          </Pressable>
        </View>
      </Card>

      <View style={styles.refreshBar}>
        <Pressable onPress={onRefresh} style={styles.refreshButton}>
          <RefreshCw color={t.colors.primary} size={22} />
        </Pressable>
        <Text style={styles.refreshText}>Desliza arriba para actualizar</Text>
      </View>

      {loadingPosts && !refreshing ? (
        <ActivityIndicator size="large" color={t.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => p.id}
          renderItem={renderItem}
          contentContainerStyle={styles.postList}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.m,
      paddingTop: theme.spacing.l,
    },
    header: {
      fontSize: theme.fontSize.title,
      fontWeight: 'bold',
      marginBottom: theme.spacing.m,
      textAlign: 'center',
      color: theme.colors.primary,
    },
    newPost: {
      marginBottom: theme.spacing.l,
    },
    input: {
      minHeight: 70,
      padding: theme.spacing.m,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.m,
      textAlignVertical: 'top',
      fontSize: theme.fontSize.body,
      marginBottom: theme.spacing.m,
      color: theme.colors.text,
    },
    previewImage: {
      width: '100%',
      height: 180,
      borderRadius: theme.borderRadius.m,
      marginBottom: theme.spacing.s,
    },
    imageButton: {
      padding: theme.spacing.s,
    },
    imageButtonText: {
      fontWeight: '600',
    },
    publishButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.m,
      borderRadius: theme.borderRadius.m,
      justifyContent: 'center',
    },
    publishButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: theme.fontSize.body,
    },
    postList: {
      paddingBottom: theme.spacing.l,
    },
    post: {
      marginBottom: theme.spacing.m,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.s,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: theme.spacing.s,
    },
    avatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.placeholder,
      marginRight: theme.spacing.s,
    },
    username: {
      fontWeight: 'bold',
      fontSize: theme.fontSize.body,
      color: theme.colors.text,
    },
    message: {
      fontSize: theme.fontSize.body,
      marginBottom: theme.spacing.s,
      color: theme.colors.text,
    },
    postImage: {
      width: '100%',
      height: 200,
      borderRadius: theme.borderRadius.m,
      marginBottom: theme.spacing.s,
    },
    timestamp: {
      fontSize: theme.fontSize.small,
      color: theme.colors.placeholder,
      textAlign: 'right',
    },
    refreshBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
      justifyContent: 'center',
      gap: 8,
    },
    refreshButton: {
      marginRight: 8,
      padding: 6,
    },
    refreshText: {
      fontSize: 13,
      color: theme.colors.placeholder,
    },
  });
