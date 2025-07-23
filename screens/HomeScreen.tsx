import React, { useEffect, useState, useCallback } from 'react';
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
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { POSTS_BASE_URL } from '../api';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

interface Props {
  userName: string;
}
interface Post {
  id: string;
  mensaje: string;
  imagen_url: string | null;
  created_at: string;
  usuarios: { id: string; nombre: string; foto_url: string | null };
}

export default function HomeScreen({ userName }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [imagen, setImagen] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Para editar post
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMensaje, setEditMensaje] = useState('');
  const [editImagen, setEditImagen] = useState<string | null>(null);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const { theme: t } = useTheme();
  const navigation = useNavigation<any>();
  const styles = makeStyles(t);

  useEffect(() => {
    (async () => {
      setUserId(await AsyncStorage.getItem('userId'));
      setToken(await AsyncStorage.getItem('token'));
      obtenerPosts();
    })();
  }, []);

  useEffect(() => {
    navigation.setOptions?.({
      headerRight: () => (
        <Pressable onPress={obtenerPosts} style={{ marginRight: 15 }}>
          <Ionicons name="refresh" size={24} color={t.colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, t]);

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
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    obtenerPosts();
  }, []);

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
    if (!result.canceled) {
      setImagen(result.assets[0].uri);
    }
  };

  const subirImagen = async (uri: string): Promise<string | null> => {
    try {
      const match = /\.(\w+)$/.exec(uri);
      const fileExt = match ? match[1].toLowerCase() : 'jpg';
      const contentType =
        fileExt === 'png'
          ? 'image/png'
          : fileExt === 'jpeg' || fileExt === 'jpg'
          ? 'image/jpeg'
          : 'application/octet-stream';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadRes = await supabase.storage
        .from('posts')
        .upload(fileName, blob, {
          contentType,
          upsert: true,
        });

      if (uploadRes.error) {
        return null;
      }

      const { data } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);
      return data?.publicUrl || null;
    } catch {
      return null;
    }
  };

  const publicar = async () => {
    if (!mensaje.trim()) {
      Alert.alert('Escribe un mensaje para publicar');
      return;
    }
    if (!userId || !token) {
      Alert.alert('Error de sesión');
      return;
    }
    try {
      setLoadingPosts(true);
      let imageUrl: string | null = null;
      if (imagen) {
        imageUrl = await subirImagen(imagen);
        if (!imageUrl) {
          Alert.alert('Error', 'Error inesperado al subir la imagen');
          setLoadingPosts(false);
          return;
        }
      }

      await fetch(`${POSTS_BASE_URL}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mensaje,
          imagen_url: imageUrl,
        }),
      });

      setMensaje('');
      setImagen(null);
      obtenerPosts();
    } catch {
      Alert.alert('Error al publicar');
    } finally {
      setLoadingPosts(false);
    }
  };

  const eliminarPost = async (postId: string) => {
    if (!token) {
      Alert.alert('Error de sesión');
      return;
    }
    Alert.alert(
      '¿Eliminar publicación?',
      '¿Estás seguro de que deseas eliminar este post?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingPosts(true);
              await fetch(`${POSTS_BASE_URL}/${postId}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              obtenerPosts();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            } finally {
              setLoadingPosts(false);
            }
          },
        },
      ]
    );
  };

  // --- EDICIÓN DE POST ---
  const openEditModal = (post: Post) => {
    setEditMensaje(post.mensaje);
    setEditImagen(post.imagen_url || null);
    setEditPostId(post.id);
    setEditModalVisible(true);
  };

  const seleccionarImagenEdicion = async () => {
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
    if (!result.canceled) {
      setEditImagen(result.assets[0].uri);
    }
  };

  const actualizarPost = async () => {
    if (!editPostId || !token) return;
    if (!editMensaje.trim()) {
      Alert.alert('Escribe un mensaje');
      return;
    }
    setLoadingEdit(true);

    let imageUrl: string | null = editImagen;
    // Si la imagen fue cambiada (es un URI local)
    if (editImagen && editImagen.startsWith('file')) {
      imageUrl = await subirImagen(editImagen);
      if (!imageUrl) {
        Alert.alert('Error', 'Error inesperado al subir la imagen');
        setLoadingEdit(false);
        return;
      }
    }

    try {
      await fetch(`${POSTS_BASE_URL}/${editPostId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mensaje: editMensaje,
          imagen_url: imageUrl,
        }),
      });
      setEditModalVisible(false);
      setEditMensaje('');
      setEditImagen(null);
      setEditPostId(null);
      obtenerPosts();
    } catch {
      Alert.alert('Error al actualizar');
    } finally {
      setLoadingEdit(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buen día';
    if (h < 18) return 'Buena tarde';
    return 'Buena noche';
  };

  const renderItem = ({ item }: { item: Post }) => {
    const isMine = userId && item.usuarios.id === userId;
    return (
      <Card style={styles.post}>
        <View style={styles.userInfo}>
          {item.usuarios.foto_url ? (
            <Image source={{ uri: item.usuarios.foto_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <Text style={styles.username}>{item.usuarios.nombre}</Text>
          {isMine && (
            <Pressable
              style={{ marginLeft: 10, padding: 4 }}
              onPress={() => {
                // Opciones: Editar / Eliminar
                Alert.alert(
                  'Opciones',
                  '',
                  [
                    { text: 'Editar', onPress: () => openEditModal(item) },
                    { text: 'Eliminar', style: 'destructive', onPress: () => eliminarPost(item.id) },
                    { text: 'Cancelar', style: 'cancel' },
                  ]
                );
              }}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={t.colors.text} />
            </Pressable>
          )}
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
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Text style={styles.header}>{getGreeting()}, {userName}</Text>

      {/* NUEVO POST */}
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
          <View style={{ alignItems: 'center', marginBottom: t.spacing.s }}>
            <Image source={{ uri: imagen }} style={{ width: 120, height: 120, borderRadius: 8 }} />
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
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
          >
            {loadingPosts ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.publishButtonText}>Publicar</Text>
            )}
          </Pressable>
        </View>
      </Card>

      {/* LISTA DE POSTS */}
      {loadingPosts ? (
        <ActivityIndicator size="large" color={t.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => p.id}
          renderItem={renderItem}
          contentContainerStyle={styles.postList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[t.colors.primary]}
            />
          }
        />
      )}

      {/* MODAL DE EDICIÓN */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Editar publicación</Text>
            <TextInput
              style={styles.input}
              placeholder="Mensaje"
              placeholderTextColor={t.colors.placeholder}
              multiline
              value={editMensaje}
              onChangeText={setEditMensaje}
            />
            {editImagen && (
              <View style={{ alignItems: 'center', marginBottom: t.spacing.s }}>
                <Image source={{ uri: editImagen }} style={{ width: 120, height: 120, borderRadius: 8 }} />
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable
                onPress={seleccionarImagenEdicion}
                style={({ pressed }) => [
                  styles.imageButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.imageButtonText, { color: t.colors.primary }]}>
                  {editImagen ? 'Cambiar imagen' : 'Agregar imagen'}
                </Text>
              </Pressable>
              <Pressable
                onPress={actualizarPost}
                style={({ pressed }) => [
                  styles.publishButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                disabled={loadingEdit}
              >
                {loadingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.publishButtonText}>Guardar</Text>
                )}
              </Pressable>
            </View>
            <Pressable onPress={() => setEditModalVisible(false)} style={styles.cancelButton}>
              <Text style={{ color: t.colors.primary, fontWeight: '600', textAlign: 'center' }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: theme.colors.card,
      padding: 24,
      borderRadius: theme.borderRadius.l,
      width: '90%',
    },
    modalTitle: {
      fontSize: theme.fontSize.title,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: 18,
      textAlign: 'center',
    },
    cancelButton: {
      marginTop: 14,
    },
  });
