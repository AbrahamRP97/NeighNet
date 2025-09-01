import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Alert, Pressable, Modal, StatusBar, SafeAreaView, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';

type Profile = {
  id: string;
  nombre: string;
  telefono?: string | null;
  foto_url?: string | null;
};

const AVATAR_SIZE = 120;

export default function UserProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { theme, themeType } = useTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const userId = route.params?.userId;

  useEffect(() => {
    if (!userId) {
      Alert.alert('Error', 'Usuario no válido');
      navigation.goBack();
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${AUTH_BASE_URL}/public/${userId}`, { headers: { 'Content-Type': 'application/json' } });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok || !data?.id) {
          Alert.alert('Error', data?.error || 'No se pudo cargar el perfil');
          navigation.goBack();
          return;
        }
        setProfile(data);
      } catch {
        Alert.alert('Error de conexión', 'No se pudo conectar con el servidor');
        navigation.goBack();
      } finally { setLoading(false); }
    })();
  }, [userId]);

  const initials = useMemo(() => {
    const n = profile?.nombre?.trim() || '';
    if (!n) return '';
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? '').join('');
  }, [profile?.nombre]);

  const handleCall = () => {
    if (!profile?.telefono) return;
    const phone = profile.telefono.replace(/\s+/g, '');
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>No se encontró el perfil</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar translucent barStyle={themeType === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Fondos decorativos */}
      <View style={[styles.bgCircle, { backgroundColor: theme.colors.primary + '22', top: -80, left: -80 }]} />
      <View style={[styles.bgCircle, { backgroundColor: theme.colors.primary + '1A', bottom: -120, right: -100 }]} />

      <SafeAreaView style={styles.safe}>
        {/* Cerrar */}
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.closeBtn,
            {
              backgroundColor: themeType === 'dark' ? theme.colors.card + 'AA' : theme.colors.card + 'CC',
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          hitSlop={12}
        >
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </Pressable>

        {/* Espacio superior */}
        <View style={{ height: 16 }} />

        {/* Card principal usando tu componente */}
        <Card style={{ marginHorizontal: 16, marginTop: 36, paddingTop: AVATAR_SIZE / 2 + 16, paddingBottom: 16, alignItems: 'center' }}>
          {/* Avatar con anillo sobrepuesto */}
          <Pressable onPress={() => profile.foto_url && setPreviewOpen(true)} style={styles.avatarWrap}>
            <View style={[styles.ring, { borderColor: theme.colors.primary + '66' }]}>
              {profile.foto_url ? (
                <Image source={{ uri: profile.foto_url }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: theme.colors.placeholder + '55', alignItems: 'center', justifyContent: 'center' },
                  ]}
                >
                  <Text style={{ fontSize: 40, fontWeight: '700', letterSpacing: 1, color: theme.colors.text + 'CC' }}>
                    {initials}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>

          {/* Nombre */}
          <Text
            style={{ marginTop: AVATAR_SIZE / 2 + 12, fontSize: theme.fontSize.title, fontWeight: '800', textAlign: 'center', color: theme.colors.text }}
            numberOfLines={2}
          >
            {profile.nombre}
          </Text>

          {/* Teléfono */}
          <View style={[styles.rowCenter, { marginTop: 12 }]}>
            {profile.telefono ? (
              <>
                <Ionicons name="call-outline" size={18} color={theme.colors.text + '99'} />
                <Text style={{ fontSize: theme.fontSize.body, fontWeight: '500', color: theme.colors.text + 'CC' }}>
                  {profile.telefono}
                </Text>
                <Pressable onPress={handleCall} style={styles.chipBtn} hitSlop={10}>
                  <Ionicons name="call" size={18} color={theme.colors.primary} />
                </Pressable>
              </>
            ) : (
              <>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.text + '99'} />
                <Text style={{ fontSize: theme.fontSize.body, color: theme.colors.text + '99' }}>Sin teléfono público</Text>
              </>
            )}
          </View>
        </Card>
      </SafeAreaView>

      {/* Modal de foto */}
      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalClose} onPress={() => setPreviewOpen(false)} hitSlop={12}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {profile.foto_url ? <Image source={{ uri: profile.foto_url }} style={styles.modalImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  bgCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },

  closeBtn: {
    position: 'absolute',
    top: 14, // un poco más abajo para no quedar pegado al borde
    right: 12,
    zIndex: 10,
    padding: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },

  avatarWrap: { position: 'absolute', top: -AVATAR_SIZE / 2, alignSelf: 'center' },
  ring: {
    width: AVATAR_SIZE + 12,
    height: AVATAR_SIZE + 12,
    borderRadius: (AVATAR_SIZE + 12) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0000',
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },

  rowCenter: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center', flexDirection: 'row', gap: 8 },
  chipBtn: { marginLeft: 6, padding: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: '#000D', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 48, right: 20, padding: 8 },
  modalImage: { width: '92%', height: '75%' },
});
