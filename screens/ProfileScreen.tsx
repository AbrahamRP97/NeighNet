import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Settings as SettingsIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from '../context/ProfileContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { loading, profile, avatarUrl, refreshProfile } = useProfile();

  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    (async () => {
      const tk = await AsyncStorage.getItem('token');
      if (!tk) {
        Alert.alert('Sesión', 'Debes iniciar sesión nuevamente.');
      }
      setSessionReady(true);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (sessionReady) {
        refreshProfile();
      }
    }, [refreshProfile, sessionReady])
  );

  if (loading && !profile) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ShimmerPlaceHolder LinearGradient={LinearGradient} style={styles.skeletonBanner} />
        <ShimmerPlaceHolder LinearGradient={LinearGradient} style={styles.skeletonAvatar} />
        <ShimmerPlaceHolder LinearGradient={LinearGradient} style={styles.skeletonLine} />
        <ShimmerPlaceHolder LinearGradient={LinearGradient} style={styles.skeletonLine} />
        <ShimmerPlaceHolder LinearGradient={LinearGradient} style={styles.skeletonLine} />
        <ShimmerPlaceHolder LinearGradient={LinearGradient} style={styles.skeletonLine} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header con solo tuerca ⚙️ */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate('OptionsScreen')}
          style={styles.headerButton}
        >
          <SettingsIcon color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>

      {/* Banner con gradiente */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <Text style={styles.bannerTitle}>👤 Perfil</Text>
      </LinearGradient>

      {/* Avatar */}
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('EditProfileScreen');
        }}
        activeOpacity={0.8}
        style={{ marginTop: -50 }}
      >
        <Image
          source={avatarUrl ? { uri: avatarUrl } : require('../assets/default-profile.png')}
          style={styles.avatar}
          key={avatarUrl || 'default'}
        />
        <Text style={[styles.editHint, { color: theme.colors.primary }]}>
          Toca la foto para editar
        </Text>
      </TouchableOpacity>

      {/* Campos de perfil */}
      <TextInput
        style={[styles.input, styles.disabledInput]}
        editable={false}
        value={profile?.nombre ?? ''}
        placeholder="Nombre"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input, styles.disabledInput]}
        editable={false}
        value={profile?.correo ?? ''}
        placeholder="Correo"
        keyboardType="email-address"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input, styles.disabledInput]}
        editable={false}
        value={profile?.telefono ?? ''}
        placeholder="Teléfono"
        keyboardType="phone-pad"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input, styles.disabledInput]}
        editable={false}
        value={profile?.numero_casa ?? ''}
        placeholder="Número de casa"
        placeholderTextColor={theme.colors.placeholder}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 12 },
  headerRow: { 
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 12, // 🔽 Bajamos un poco la posición
  },
  headerButton: {
    padding: 6, // para que sea más fácil de presionar
  },
  banner: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 60,
  },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  avatar: {
    width: 100, height: 100, borderRadius: 50, alignSelf: 'center',
    marginBottom: 6, backgroundColor: '#eee', borderWidth: 3, borderColor: '#fff'
  },
  editHint: { textAlign: 'center', marginBottom: 16, fontSize: 13 },
  input: { backgroundColor: '#fff', padding: 12, marginBottom: 12, borderRadius: 8, borderColor: '#ccc', borderWidth: 1, color: '#000' },
  disabledInput: { backgroundColor: '#eee', color: '#777' },
  skeletonBanner: { height: 70, borderRadius: 16, marginBottom: 20 },
  skeletonAvatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 16 },
  skeletonLine: { height: 20, borderRadius: 8, marginBottom: 12 },
});
