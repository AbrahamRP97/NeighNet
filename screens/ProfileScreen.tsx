import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Settings as SettingsIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from '../context/ProfileContext';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { loading, profile, avatarUrl, refreshProfile } = useProfile();

  useFocusEffect(
    useCallback(() => {
      // Cada vez que entras/retomas foco, refresca el perfil (agarra nueva foto firmada)
      refreshProfile();
    }, [refreshProfile])
  );

  // Si hubo un error grave y no hay perfil, puedes mostrar alerta aquí si quieres
  // pero asumimos que el provider maneja los logs y no rompe la UI.

  if (loading && !profile) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            console.log('[ProfileScreen] Ir a OptionsScreen');
            navigation.navigate('OptionsScreen');
          }}
        >
          <SettingsIcon color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: theme.colors.primary }]}>👤 Perfil</Text>

      <TouchableOpacity
        onPress={() => {
          console.log('[ProfileScreen] Tap en avatar -> navegar a EditProfileScreen');
          navigation.navigate('EditProfileScreen');
        }}
        activeOpacity={0.8}
      >
        <Image
          source={avatarUrl ? { uri: avatarUrl } : require('../assets/default-profile.png')}
          style={styles.avatar}
          key={avatarUrl || 'default'} // fuerza re-render si cambia la URL
        />
        <Text style={[styles.editHint, { color: theme.colors.primary }]}>
          Toca la foto para editar
        </Text>
      </TouchableOpacity>

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
  container: { flexGrow: 1, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 6, backgroundColor: '#eee' },
  editHint: { textAlign: 'center', marginBottom: 16, fontSize: 13 },
  input: { backgroundColor: '#fff', padding: 12, marginBottom: 12, borderRadius: 8, borderColor: '#ccc', borderWidth: 1, color: '#000' },
  disabledInput: { backgroundColor: '#eee', color: '#777' },
  skeletonAvatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 16 },
  skeletonLine: { height: 20, borderRadius: 8, marginBottom: 12 },
});
