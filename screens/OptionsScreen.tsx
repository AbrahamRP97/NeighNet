import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Edit,
  Lock,
  Moon,
  Trash2,
  LogOut,
  ArrowLeft,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from '../context/ProfileContext';

export default function OptionsScreen() {
  const navigation = useNavigation<any>();
  const { theme, themeType, toggleTheme } = useTheme();
  const { clearProfile } = useProfile();

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.clear();
          } finally {
            clearProfile();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es irreversible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar eliminación',
              'Se eliminarán todos tus datos de manera permanente. ¿Deseas continuar?',
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Sí, eliminar cuenta',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const userId = await AsyncStorage.getItem('userId');
                      const tk = await AsyncStorage.getItem('token');
                      if (!userId || !tk) throw new Error('Credenciales no encontradas');
                      const base =
                        process.env.EXPO_PUBLIC_AUTH_BASE_URL ||
                        'https://neighnet-backend.onrender.com/api/auth';
                      const res = await fetch(`${base}/delete/${userId}`, {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${tk}`, // <-- token
                        },
                      });
                      if (!res.ok) throw new Error('No se pudo eliminar la cuenta');
                      await AsyncStorage.clear();
                    } catch (err) {
                      Alert.alert('Error', 'No se pudo eliminar la cuenta');
                      return;
                    }
                    clearProfile();
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    });
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.primary} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.primary }]}>Configuración</Text>
        <View style={{ width: 28 }} />
      </View>

      <TouchableOpacity
        style={styles.option}
        onPress={() => navigation.navigate('EditProfileScreen')}
      >
        <Edit color={theme.colors.primary} size={22} />
        <Text style={[styles.optionText, { color: theme.colors.text }]}>Editar perfil</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => navigation.navigate('ChangePasswordScreen')}
      >
        <Lock color={theme.colors.primary} size={22} />
        <Text style={[styles.optionText, { color: theme.colors.text }]}>Cambiar contraseña</Text>
      </TouchableOpacity>

      <View style={styles.option}>
        <Moon color={theme.colors.primary} size={22} />
        <Text style={[styles.optionText, { color: theme.colors.text }]}>Modo oscuro</Text>
        <Switch
          style={{ marginLeft: 'auto' }}
          value={themeType === 'dark'}
          onValueChange={toggleTheme}
          trackColor={{ false: theme.colors.placeholder, true: theme.colors.primary }}
          thumbColor={theme.colors.card}
        />
      </View>

      <TouchableOpacity
        style={[styles.option, styles.deleteOption]}
        onPress={handleDeleteAccount}
      >
        <Trash2 color="red" size={22} />
        <Text style={[styles.optionText, { color: 'red' }]}>Eliminar cuenta</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleLogout}
      >
        <LogOut color="#fff" size={22} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 14,
  },
  deleteOption: {
    marginTop: 20,
    borderBottomWidth: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
});
