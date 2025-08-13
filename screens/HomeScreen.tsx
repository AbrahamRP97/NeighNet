import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  ScrollView,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { POSTS_BASE_URL, UPLOADS_BASE_URL } from '../api';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useProfile } from '../context/ProfileContext';

interface Props {
  userName: string;
}

interface Post {
  id: string;
  mensaje: string;
  imagen_url: string | null;        
  imagenes_url?: string[] | null;   
  created_at: string;
  usuarios: { id: string; nombre: string; foto_url: string | null };
}

type FeedResponse =
  | Post[] // legacy
  | {
      items: Post[];
      nextCursor: string | null;
    };

const MAX_CHARS = 480;
const DISPLAY_TRUNCATE = 250;

const BANNED_WORDS = [
  'mierda', 'pendejo', 'pendeja', 'estupido', 'estúpido', 'idiota',
  'imbecil', 'imbécil', 'maldito', 'maldita', 'cabrón', 'cabron',
  'puta', 'puto', 'joder', 'carajo', 'coño', 'gilipollas', 'chinga',
  'chingar', 'verga', 'culo', 'polla', 'zorra', 'maricón', 'maricon',
  'puta madre', 'hijo de puta', 'hijos de puta', 'la concha de tu madre',
  'me cago en', 'me cago en la', 'me cago en el', 'me cago en tus', 'me cago en tu',
  'chupapollas', 'cagada', 'cagar', 'cagarse','ijueputa','malparida',
  'come mierda', 'comemierda', 'chupamela', 'chúpamela', 'chupamelo', 'chúpamelo',
  'jodete', 'jódete', 'jodidos', 'jodidas', 'jodida', 'jodido', 'joderte', 'joderles',
  'porlagranputa', 'por la gran puta', 'hijueputa', 'hijo de la gran puta', 'hijos de la gran puta',
  'hijueputa', 'hijos de puta', 'la gran puta', 'malparido'
];

const normalizeForCheck = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const hasBannedWords = (text: string) => {
  const plain = normalizeForCheck(text).replace(/[^a-záéíóúüñ0-9\s]/gi, ' ');
  const tokens = plain.split(/\s+/).filter(Boolean);
  const bannedSet = new Set(BANNED_WORDS.map(normalizeForCheck));
  const found = Array.from(new Set(tokens.filter(t => bannedSet.has(t))));
  return { found: found.length > 0, words: found };
};

const PAGE_SIZE = 10;

export default function HomeScreen({ userName }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const reachedEndRef = useRef(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMensaje, setEditMensaje] = useState('');
  const [editImagenes, setEditImagenes] = useState<string[]>([]);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { theme: t } = useTheme();
  const navigation = useNavigation<any>();
  const { avatarUrl } = useProfile();
  const styles = makeStyles(t);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
  (async () => {
    const uid = await AsyncStorage.getItem('userId');
    const tk = await AsyncStorage.getItem('token');
    setUserId(uid);
    setToken(tk);
    setSessionReady(true);
  })();
}, []);


  useFocusEffect(
  useCallback(() => {
    if (sessionReady && token) {
      cargarPrimeraPagina();
    }
  }, [sessionReady, token])
);


  useEffect(() => {
  navigation.setOptions?.({
    headerRight: () => (
      <Pressable
        onPress={() => sessionReady && token && cargarPrimeraPagina()}
        style={{ marginRight: 15 }}
      >
        <Ionicons name="refresh" size={24} color={t.colors.primary} />
      </Pressable>
    ),
  });
}, [navigation, t, sessionReady, token]);

  const parseFeed = (resp: FeedResponse) => {
    if (Array.isArray(resp)) {
      return { items: resp, nextCursor: null };
    }
    return resp;
  };

  const cargarPrimeraPagina = async () => {
  if (!token) return;
  setLoadingPosts(true);
  reachedEndRef.current = false;
  try {
    const url = `${POSTS_BASE_URL}?limit=${PAGE_SIZE}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error || 'No se pudieron cargar las publicaciones';
      throw new Error(msg);
    }

    const data = await res.json();
    const parsed = Array.isArray(data)
      ? { items: data, nextCursor: null }
      : (data && Array.isArray(data.items) ? { items: data.items, nextCursor: data.nextCursor ?? null } : null);

    if (!parsed) throw new Error('Respuesta del servidor inválida');

    setPosts(parsed.items);
    setNextCursor(parsed.nextCursor);
    setExpanded({});
  } catch (e: any) {
    Alert.alert('Error', e?.message || 'No se pudieron cargar las publicaciones');
    setPosts([]);
    setNextCursor(null);
  } finally {
    setLoadingPosts(false);
    setRefreshing(false);
  }
};


  const cargarMas = async () => {
  if (loadingMore || loadingPosts || !nextCursor || reachedEndRef.current || !token) return;
  setLoadingMore(true);
  try {
    const url = `${POSTS_BASE_URL}?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }, // <-- token
    });

    if (!res.ok) {
      reachedEndRef.current = true;
      return;
    }

    const data = await res.json();
    const parsed = Array.isArray(data)
      ? { items: data, nextCursor: null }
      : (data && Array.isArray(data.items) ? { items: data.items, nextCursor: data.nextCursor ?? null } : null);

    if (!parsed || !parsed.items.length) {
      reachedEndRef.current = true;
    } else {
      setPosts(prev => [...prev, ...parsed.items]);
      setNextCursor(parsed.nextCursor);
      if (!parsed.nextCursor) reachedEndRef.current = true;
    }
  } catch {
    // silencioso
  } finally {
    setLoadingMore(false);
  }
};


  const onRefresh = useCallback(() => {
  setRefreshing(true);
  if (token) cargarPrimeraPagina();
  }, [token]);

  const seleccionarImagenes = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a las fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setImagenes(prev => [...prev, ...uris]);
    }
  };

  const removeImagenNueva = (uri: string) => {
    setImagenes(prev => prev.filter(u => u !== uri));
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
      const fileName = `${userId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${fileExt}`;
      const fileUri = uri.startsWith('file://') ? uri : 'file://' + uri;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) return null;

      const resp = await fetch(fileUri);
      const blob = await resp.blob();

      const signedRes = await fetch(`${UPLOADS_BASE_URL}/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType, bucket: 'posts' }),
      });
      if (!signedRes.ok) return null;
      const { signedUrl, publicUrl } = await signedRes.json();

      const putResp = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'content-type': contentType, 'x-upsert': 'true' },
        body: blob,
      });
      if (!putResp.ok) return null;

      return publicUrl || null;
    } catch {
      return null;
    }
  };

  const subirImagenes = async (uris: string[]): Promise<string[] | null> => {
    const results: string[] = [];
    for (const uri of uris) {
      const url = await subirImagen(uri);
      if (!url) return null;
      results.push(url);
    }
    return results;
  };

  const validateMessage = (text: string) => {
    if (!text.trim()) {
      Alert.alert('Escribe un mensaje para publicar');
      return false;
    }
    if (text.length > MAX_CHARS) {
      Alert.alert('Límite de caracteres', `El mensaje no puede superar ${MAX_CHARS} caracteres.`);
      return false;
    }
    const { found, words } = hasBannedWords(text);
    if (found) {
      Alert.alert(
        'Contenido no permitido',
        `Tu mensaje contiene palabras no permitidas: ${words.join(', ')}.`
      );
      return false;
    }
    return true;
  };


  const publicar = async () => {
    if (!userId || !token) {
      Alert.alert('Error de sesión');
      return;
    }
    if (!validateMessage(mensaje)) return;

    try {
      setLoadingPosts(true);

      let imageUrls: string[] = [];
      if (imagenes.length > 0) {
        const uploaded = await subirImagenes(imagenes);
        if (!uploaded) {
          Alert.alert('Error', 'Error al subir alguna de las imágenes');
          setLoadingPosts(false);
          return;
        }
        imageUrls = uploaded;
      }

      const res = await fetch(`${POSTS_BASE_URL}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mensaje,
          imagen_url: imageUrls[0] || null,
          imagenes_url: imageUrls,
        }),
      });

      if (!res.ok) {
        // Si el backend devuelve 400 por filtro o límite, mostramos su mensaje
        const maybeJson = await res.json().catch(() => null);
        const backendMsg = maybeJson?.error || 'Error al publicar';
        Alert.alert('Ups', backendMsg);
        setLoadingPosts(false);
        return;
      }

      setMensaje('');
      setImagenes([]);
      await cargarPrimeraPagina();
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
                headers: { Authorization: `Bearer ${token}` },
              });
              await cargarPrimeraPagina();
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


  const getImagenesFromPost = (p: Post): string[] => {
    if (Array.isArray(p.imagenes_url) && p.imagenes_url.length) return p.imagenes_url;
    if (p.imagen_url) return [p.imagen_url];
    return [];
  };


  const openEditModal = (post: Post) => {
    setEditMensaje(post.mensaje);
    setEditImagenes(getImagenesFromPost(post));
    setEditPostId(post.id);
    setEditModalVisible(true);
  };

  const seleccionarImagenesEdicion = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a las fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setEditImagenes(prev => [...prev, ...uris]);
    }
  };

  const removeImagenEdicion = (uri: string) => {
    setEditImagenes(prev => prev.filter(u => u !== uri));
  };

  const actualizarPost = async () => {
    if (!editPostId || !token) return;
    if (!validateMessage(editMensaje)) return;

    setLoadingEdit(true);

    const locales = editImagenes.filter(u => u.startsWith('file:'));
    const remotas = editImagenes.filter(u => !u.startsWith('file:'));

    let nuevasSubidas: string[] = [];
    if (locales.length) {
      const up = await subirImagenes(locales);
      if (!up) {
        Alert.alert('Error', 'Error al subir alguna imagen');
        setLoadingEdit(false);
        return;
      }
      nuevasSubidas = up;
    }
    const finalUrls = [...remotas, ...nuevasSubidas];

    try {
      const res = await fetch(`${POSTS_BASE_URL}/${editPostId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mensaje: editMensaje,
          imagen_url: finalUrls[0] || null, // compat
          imagenes_url: finalUrls,          // multi
        }),
      });

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => null);
        const backendMsg = maybeJson?.error || 'Error al actualizar';
        Alert.alert('Ups', backendMsg);
        setLoadingEdit(false);
        return;
      }

      setEditModalVisible(false);
      setEditMensaje('');
      setEditImagenes([]);
      setEditPostId(null);
      await cargarPrimeraPagina();
    } catch {
      Alert.alert('Error al actualizar');
    } finally {
      setLoadingEdit(false);
    }
  };

  const openImagePreview = (images: string[], startIndex: number) => {
    setPreviewImages(images);
    setPreviewIndex(startIndex);
    setPreviewVisible(true);
  };
  const closeImagePreview = () => {
    setPreviewVisible(false);
    setPreviewImages([]);
    setPreviewIndex(0);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buen día';
    if (h < 18) return 'Buena tarde';
    return 'Buena noche';
  };

  const handleChangeMensaje = (text: string) => {
    if (text.length <= MAX_CHARS) setMensaje(text);
    else setMensaje(text.slice(0, MAX_CHARS));
  };
  const handleChangeEditMensaje = (text: string) => {
    if (text.length <= MAX_CHARS) setEditMensaje(text);
    else setEditMensaje(text.slice(0, MAX_CHARS));
  };

  const renderItem = ({ item }: { item: Post }) => {
    const isMine = userId && item.usuarios.id === userId;
    const finalAvatar = isMine ? avatarUrl : item.usuarios.foto_url;
    const imgs = getImagenesFromPost(item);

    const isExpanded = !!expanded[item.id];
    const needsTruncate = item.mensaje.length > DISPLAY_TRUNCATE;
    const shownText =
      needsTruncate && !isExpanded
        ? item.mensaje.slice(0, DISPLAY_TRUNCATE) + '…'
        : item.mensaje;

    return (
      <Card style={styles.post}>
        <View style={styles.userInfo}>
          {finalAvatar ? (
            <Image source={{ uri: finalAvatar }} style={styles.avatar} key={finalAvatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <Text style={styles.username}>{item.usuarios.nombre}</Text>
          {isMine && (
            <Pressable
              style={{ marginLeft: 10, padding: 4 }}
              onPress={() => {
                Alert.alert('Opciones', '', [
                  { text: 'Editar', onPress: () => openEditModal(item) },
                  { text: 'Eliminar', style: 'destructive', onPress: () => eliminarPost(item.id) },
                  { text: 'Cancelar', style: 'cancel' },
                ]);
              }}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={t.colors.text} />
            </Pressable>
          )}
        </View>

        <Text style={styles.message}>{shownText}</Text>

        {needsTruncate && (
          <Pressable
            onPress={() =>
              setExpanded(prev => ({ ...prev, [item.id]: !prev[item.id] }))
            }
          >
            <Text style={[styles.readMore, { color: t.colors.primary }]}>
              {isExpanded ? 'Ver menos' : 'Ver más'}
            </Text>
          </Pressable>
        )}

        {/* Galería del post */}
        {imgs.length > 0 && (
          <View style={{ marginBottom: t.spacing.s }}>
            <Pressable onPress={() => openImagePreview(imgs, 0)}>
              <Image source={{ uri: imgs[0] }} style={styles.postImage} />
              {imgs.length > 1 && (
                <View style={styles.multiBadge}>
                  <Ionicons name="images-outline" size={16} color="#fff" />
                  <Text style={styles.multiBadgeText}>{imgs.length}</Text>
                </View>
              )}
            </Pressable>

            {imgs.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 6 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {imgs.slice(1).map((u, idx) => (
                  <Pressable key={u} onPress={() => openImagePreview(imgs, idx + 1)}>
                    <Image source={{ uri: u }} style={styles.thumb} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

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
          onChangeText={handleChangeMensaje}
        />
        {/* Contador de caracteres */}
        <Text style={[styles.charCounter, { color: mensaje.length > MAX_CHARS ? t.colors.error : t.colors.placeholder }]}>
          {mensaje.length}/{MAX_CHARS}
        </Text>

        {/* Bandeja de imágenes seleccionadas (crear) */}
        {imagenes.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: t.spacing.s }}
            contentContainerStyle={{ gap: 10 }}
          >
            {imagenes.map((u) => (
              <View key={u} style={styles.thumbWrap}>
                <Image source={{ uri: u }} style={styles.thumb} />
                <Pressable style={styles.removeBtn} onPress={() => removeImagenNueva(u)}>
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable
            onPress={seleccionarImagenes}
            style={({ pressed }) => [styles.imageButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.imageButtonText, { color: t.colors.primary }]}>
              {imagenes.length > 0 ? 'Agregar más' : 'Agregar imágenes'}
            </Text>
          </Pressable>
          <Pressable
            onPress={publicar}
            style={({ pressed }) => [styles.publishButton, { opacity: pressed ? 0.8 : 1 }]}
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
      {loadingPosts && posts.length === 0 ? (
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
          onEndReachedThreshold={0.4}
          onEndReached={cargarMas}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={t.colors.primary} />
            ) : null
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
              onChangeText={handleChangeEditMensaje}
            />
            {/* Contador de caracteres (edición) */}
            <Text style={[styles.charCounter, { color: editMensaje.length > MAX_CHARS ? t.colors.error : t.colors.placeholder }]}>
              {editMensaje.length}/{MAX_CHARS}
            </Text>

            {/* Bandeja de imágenes en edición */}
            {editImagenes.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: t.spacing.s }}
                contentContainerStyle={{ gap: 10 }}
              >
                {editImagenes.map((u) => (
                  <View key={u} style={styles.thumbWrap}>
                    <Image source={{ uri: u }} style={styles.thumb} />
                    <Pressable style={styles.removeBtn} onPress={() => removeImagenEdicion(u)}>
                      <Ionicons name="close" size={16} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable
                onPress={seleccionarImagenesEdicion}
                style={({ pressed }) => [styles.imageButton, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.imageButtonText, { color: t.colors.primary }]}>
                  {editImagenes.length > 0 ? 'Agregar más' : 'Agregar imágenes'}
                </Text>
              </Pressable>

              <Pressable
                onPress={actualizarPost}
                style={({ pressed }) => [styles.publishButton, { opacity: pressed ? 0.8 : 1 }]}
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

      {/* MODAL PREVIEW FULLSCREEN */}
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={closeImagePreview}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' }}>
          <FlatList
            horizontal
            pagingEnabled
            data={previewImages}
            keyExtractor={(u, i) => `${u}-${i}`}
            initialScrollIndex={previewIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            initialNumToRender={3}
            windowSize={3}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
                <Image source={{ uri: item }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              </View>
            )}
          />
          <Pressable
            onPress={closeImagePreview}
            style={{ position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
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
      marginBottom: 6, // ajustado para dejar espacio al contador
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
      backgroundColor: theme.colors.placeholder,
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
      marginBottom: 4,
      color: theme.colors.text,
    },
    readMore: {
      fontWeight: '600',
      marginBottom: theme.spacing.s,
    },
    postImage: {
      width: '100%',
      height: 200,
      borderRadius: theme.borderRadius.m,
      marginBottom: theme.spacing.s,
    },
    multiBadge: {
      position: 'absolute',
      right: 8,
      bottom: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    multiBadgeText: { color: '#fff', fontWeight: '600' },
    thumb: {
      width: 70,
      height: 70,
      borderRadius: theme.borderRadius.s ?? 8,
      backgroundColor: theme.colors.placeholder,
    },
    thumbWrap: {
      width: 70,
      height: 70,
    },
    removeBtn: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 11,
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
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
    charCounter: {
      alignSelf: 'flex-end',
      marginTop: -2,
      marginBottom: 10,
      fontSize: theme.fontSize.small,
    },
  });