import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useRoute } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import { useTheme } from '../context/ThemeContext';

export default function ResetPasswordScreen({ navigation }: any) {
  const route = useRoute<any>();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  useEffect(() => {
    // Obtén token del link o params
    if (route.params?.token) {
      setToken(route.params.token);
    }
    // Si usas deep linking, también puedes obtenerlo de route.path
    // Ejemplo: neighnet2://reset-password?token=XXX
    else if (route?.params) {
      const match = /token=([^&]+)/.exec(route?.params?.path || '');
      if (match) setToken(match[1]);
    }
  }, [route.params]);

  const validarPass = (p: string) =>
    /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(p);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Completa todos los campos');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Las contraseñas no coinciden');
      return;
    }
    if (!validarPass(password)) {
      Alert.alert(
        'Contraseña insegura',
        'Debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.'
      );
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.error || 'No se pudo restablecer la contraseña');
      } else {
        Alert.alert('Éxito', 'Contraseña restablecida');
        navigation.replace('Login');
      }
    } catch (err) {
      Alert.alert('Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restablecer contraseña</Text>
      <CustomInput
        placeholder="Nueva contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <CustomInput
        placeholder="Confirmar nueva contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <CustomButton title="Cambiar contraseña" onPress={handleReset} />
      )}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 24,
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 24,
      color: theme.colors.primary,
    },
  });
