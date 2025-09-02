import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Edit, Lock, Moon, Trash2, LogOut } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from '../context/ProfileContext';
import { withHaptics, select, warning, success } from '../utils/Haptics';
import Card from '../components/Card';
import ScreenBanner from '../components/ScreenBanner';

export default function OptionsScreen() {
  const navigation = useNavigation<any>();
  const { theme, themeType, toggleTheme } = useTheme();
  const { clearProfile } = useProfile();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('userRole').then(setUserRole).catch(() => setUserRole(null));
  }, []);

  const handleLogout = async () => {
    warning();
    Alert.alert('Cerrar sesión', '¿Seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            success();
          } finally {
            clearProfile();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    warning();
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
                          Authorization: `Bearer ${tk}`,
                        },
                      });
                      if (!res.ok) throw new Error('No se pudo eliminar la cuenta');
                      await AsyncStorage.clear();
                      success();
                    } catch (err) {
                      Alert.alert('Error', 'No se pudo eliminar la cuenta');
                      return;
                    }
                    clearProfile();
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
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
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Banner con gradiente y back */}
      <ScreenBanner title="Configuración" onBack={() => navigation.goBack()} />

      {/* Opciones como Cards */}
      <Card onPress={() => navigation.navigate('EditProfileScreen')}>
        <View style={styles.row}>
          <Edit color={theme.colors.primary} size={20} />
          <Text style={[styles.rowText, { color: theme.colors.text }]}>Editar perfil</Text>
        </View>
      </Card>

      <Card onPress={() => navigation.navigate('ChangePasswordScreen')}>
        <View style={styles.row}>
          <Lock color={theme.colors.primary} size={20} />
          <Text style={[styles.rowText, { color: theme.colors.text }]}>Cambiar contraseña</Text>
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <Moon color={theme.colors.primary} size={20} />
          <Text style={[styles.rowText, { color: theme.colors.text }]}>Modo oscuro</Text>
          <Switch
            style={{ marginLeft: 'auto' }}
            value={themeType === 'dark'}
            onValueChange={() => { select(); toggleTheme()}}
            trackColor={{ false: theme.colors.placeholder, true: theme.colors.primary }}
            thumbColor={theme.colors.card}
          />
        </View>
      </Card>

      {/* ✅ Acceso al Panel Admin solo para rol admin */}
      {userRole === 'admin' && (
        <>
          <Card onPress={() => navigation.navigate('AdminVisits')}>
            <View style={styles.row}>
              <Edit color={theme.colors.primary} size={20} />
              <Text style={[styles.rowText, { color: theme.colors.text }]}>Panel Admin</Text>
            </View>
          </Card>

          {/* ✅ Nuevo acceso directo para crear visitante en nombre de un residente */}
          <Card onPress={() => navigation.navigate('AdminCreateVisitante')}>
            <View style={styles.row}>
              <Edit color={theme.colors.primary} size={20} />
              <Text style={[styles.rowText, { color: theme.colors.text }]}>Crear visitante (Admin)</Text>
            </View>
          </Card>
        </>
      )}

      <Card onPress={withHaptics(handleLogout, 'tap')}>
        <View style={[styles.row, { justifyContent: 'center' }]}>
          <LogOut color={theme.colors.primary} size={20} />
          <Text style={[styles.logoutText, { color: theme.colors.primary }]}>Cerrar sesión</Text>
        </View>
      </Card>

      {/* Footer: eliminar cuenta */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Trash2 color="red" size={20} />
          <Text style={styles.deleteText}>Eliminar cuenta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  banner: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerBack: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)' },

  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { fontSize: 16, marginLeft: 12, fontWeight: '600' },

  logoutText: { fontWeight: '700', fontSize: 16, marginLeft: 8 },

  footer: { marginTop: 24, alignItems: 'center', paddingVertical: 20 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center' },
  deleteText: { marginLeft: 8, color: 'red', fontWeight: '700', fontSize: 15 },
});
