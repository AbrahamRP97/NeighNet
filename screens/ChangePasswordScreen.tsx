import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL } from '../api';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // States para visualizar/no visualizar cada campo
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'No se encontró tu usuario');
        setLoading(false);
        return;
      }
      const payload = {
        oldPassword: currentPassword,
        newPassword,
      };
      const res = await fetch(`${AUTH_BASE_URL}/cambiar-contrasena/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = JSON.parse(text);

      if (!res.ok) {
        Alert.alert('Error', data?.error || 'No se pudo cambiar la contraseña');
        setLoading(false);
        return;
      }

      Alert.alert('Éxito', 'Contraseña cambiada correctamente', [
        { text: 'Ok', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ArrowLeft color={theme.colors.primary} size={28} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.colors.primary }]}>Cambiar contraseña</Text>

      <View style={styles.inputGroup}>
        <Lock color={theme.colors.primary} size={22} />
        <TextInput
          style={styles.input}
          placeholder="Contraseña actual"
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={!showCurrent}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
          {showCurrent ? (
            <EyeOff color={theme.colors.primary} size={22} />
          ) : (
            <Eye color={theme.colors.primary} size={22} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Lock color={theme.colors.primary} size={22} />
        <TextInput
          style={styles.input}
          placeholder="Nueva contraseña"
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={!showNew}
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity onPress={() => setShowNew(!showNew)}>
          {showNew ? (
            <EyeOff color={theme.colors.primary} size={22} />
          ) : (
            <Eye color={theme.colors.primary} size={22} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Lock color={theme.colors.primary} size={22} />
        <TextInput
          style={styles.input}
          placeholder="Confirmar nueva contraseña"
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={!showConfirm}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
          {showConfirm ? (
            <EyeOff color={theme.colors.primary} size={22} />
          ) : (
            <Eye color={theme.colors.primary} size={22} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleChangePassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Cambiar contraseña</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 32,
    left: 12,
    zIndex: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#000',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  saveButton: {
    padding: 14,
    borderRadius: 10,
    marginTop: 22,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
