import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import NetInfo from '@react-native-community/netinfo';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../theme';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasEmailError, setHasEmailError] = useState(false);
  const [hasPasswordError, setHasPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);

  const { theme: t } = useTheme();
  const styles = makeStyles(t);

  const validarCorreo = (correo: string) => /\S+@\S+\.\S+/.test(correo);
  const validarContrasena = (contrasena: string) =>
    /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(contrasena);

  const handleLogin = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert('Sin conexión', 'Activa tus datos o Wi-Fi antes de iniciar sesión.');
      return;
    }
    const correoOk = validarCorreo(email);
    const passOk = validarContrasena(password);
    setHasEmailError(!correoOk);
    setHasPasswordError(!passOk);
    if (!correoOk || !passOk) return;

    setLoading(true);
    try {
      const res = await fetch(`${AUTH_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email, contrasena: password }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        Alert.alert('Error', 'Respuesta inválida del servidor');
        return;
      }

      if (!res.ok) {
        Alert.alert('Error', data?.error || 'Credenciales inválidas');
        return;
      }

      const { usuario, token } = data || {};
      if (!usuario?.id || !usuario?.nombre || !token) {
        Alert.alert('Error', 'Datos del usuario incompletos');
        return;
      }

      // 🔑 Normaliza el token: guarda SOLO el JWT sin 'Bearer '
      const rawToken = String(token || '');
      const normalizedToken = rawToken.startsWith('Bearer ')
        ? rawToken.slice(7).trim()
        : rawToken.trim();

      await AsyncStorage.setItem('userId', String(usuario.id));
      await AsyncStorage.setItem('userName', String(usuario.nombre));
      await AsyncStorage.setItem('userRole', String(usuario.rol || 'residente'));
      await AsyncStorage.setItem('token', normalizedToken);

      navigation.replace('Main', { userName: usuario.nombre });
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Image source={require('../assets/image.png')} style={styles.logo} />
          <Text style={styles.title}>Bienvenido a NeighNet</Text>

          <CustomInput
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            hasError={hasEmailError}
          />
          <CustomInput
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            hasError={hasPasswordError}
          />

          {hasPasswordError && (
            <Text style={styles.errorText}>
              La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.
            </Text>
          )}

          {loading ? (
            <ActivityIndicator size="large" color={t.colors.primary} />
          ) : (
            <>
              <CustomButton title="Iniciar sesión" onPress={handleLogin} />
              <CustomButton title="Crear cuenta" onPress={() => navigation.navigate('Registro')} />
              <CustomButton
                title="¿Olvidaste tu contraseña?"
                onPress={() => navigation.navigate('ForgotPassword')}
              />
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      backgroundColor: theme.colors.background,
    },
    card: {
      padding: 24,
      borderRadius: 12,
    },
    logo: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 16,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
  });
