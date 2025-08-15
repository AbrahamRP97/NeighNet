import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL } from '../api';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function ChangePasswordScreen() {
  const { theme, themeType } = useTheme();
  const navigation = useNavigation<any>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordPolicyOk = (pass: string) =>
    /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(pass);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (!passwordPolicyOk(newPassword)) {
      Alert.alert(
        'Error',
        'La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert('Error', 'La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setLoading(true);
    try {
      const [userId, token] = await Promise.all([
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('token'),
      ]);

      if (!userId || !token) {
        Alert.alert(
          'Sesión requerida',
          'No se encontró un token de sesión. Inicia sesión nuevamente.',
          [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }]
        );
        setLoading(false);
        return;
      }

      const payload = { oldPassword: currentPassword, newPassword };

      const res = await fetch(`${AUTH_BASE_URL}/cambiar-contrasena/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        const msg = data?.error || `No se pudo cambiar la contraseña (status ${res.status})`;
        Alert.alert('Error', msg);
        setLoading(false);
        return;
      }

      Alert.alert('Éxito', 'Contraseña cambiada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  const kbAppearance = Platform.OS === 'ios' ? (themeType === 'dark' ? 'dark' : 'light') : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ArrowLeft color={theme.colors.primary} size={28} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.colors.primary }]}>Cambiar contraseña</Text>

      {/* Contraseña actual */}
      <View style={[styles.field, { backgroundColor: theme.colors.card, borderColor: theme.colors.placeholder }]}>
        <Lock color={theme.colors.primary} size={20} />
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          placeholder="Contraseña actual"
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={!showCurrent}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          autoCapitalize="none"
          selectionColor={theme.colors.primary}
          keyboardAppearance={kbAppearance}
          returnKeyType="next"
        />
        <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
          {showCurrent ? (
            <Eye color={theme.colors.primary} size={20} />
          ) : (
            <EyeOff color={theme.colors.primary} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {/* Nueva contraseña */}
      <View style={[styles.field, { backgroundColor: theme.colors.card, borderColor: theme.colors.placeholder }]}>
        <Lock color={theme.colors.primary} size={20} />
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          placeholder="Nueva contraseña"
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={!showNew}
          value={newPassword}
          onChangeText={setNewPassword}
          autoCapitalize="none"
          selectionColor={theme.colors.primary}
          keyboardAppearance={kbAppearance}
          returnKeyType="next"
        />
        <TouchableOpacity onPress={() => setShowNew(!showNew)}>
          {showNew ? (
            <Eye color={theme.colors.primary} size={20} />
          ) : (
            <EyeOff color={theme.colors.primary} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {/* Confirmar nueva contraseña */}
      <View style={[styles.field, { backgroundColor: theme.colors.card, borderColor: theme.colors.placeholder }]}>
        <Lock color={theme.colors.primary} size={20} />
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          placeholder="Confirmar nueva contraseña"
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={!showConfirm}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
          selectionColor={theme.colors.primary}
          keyboardAppearance={kbAppearance}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
          {showConfirm ? (
            <Eye color={theme.colors.primary} size={20} />
          ) : (
            <EyeOff color={theme.colors.primary} size={20} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
        onPress={handleChangePassword}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Cambiar contraseña</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 32, left: 12, zIndex: 2 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 24, marginBottom: 28, textAlign: 'center' },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },

  saveButton: { padding: 14, borderRadius: 10, marginTop: 18, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
