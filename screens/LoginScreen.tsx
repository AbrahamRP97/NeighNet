import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import NetInfo from '@react-native-community/netinfo';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

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
    // En login basta con que la contraseña NO esté vacía (evita bloquear logins legítimos):
    const passOk = password.trim().length > 0;
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

      // 403 por teléfono no verificado
      if (res.status === 403 && data?.needPhoneVerify) {
        Alert.alert(
          'Verificación requerida',
          'Enviamos un código por SMS a tu número. Ingrésalo para activar tu cuenta.',
          [
            {
              text: 'Continuar',
              onPress: () =>
                navigation.replace('PhoneVerification', {
                  userId: data.userId,
                  telefono: data.telefono,
                }),
            },
          ]
        );
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
        {/* Banner en gradiente */}
        <LinearGradient
          colors={[t.colors.primary, t.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <Image source={require('../assets/image.png')} style={styles.logo} />
          <Text style={styles.bannerTitle}>Bienvenido a NeighNet</Text>
          <Text style={styles.bannerSubtitle}>Conecta con tu vecindario de forma segura</Text>
        </LinearGradient>

        <Card style={styles.card}>
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
    banner: {
      borderRadius: 20,
      paddingVertical: 22,
      paddingHorizontal: 18,
      marginBottom: 16,
      alignItems: 'center',
    },
    bannerTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '800',
      marginTop: 10,
    },
    bannerSubtitle: {
      color: '#fff',
      opacity: 0.9,
      marginTop: 4,
      fontSize: 13,
      textAlign: 'center',
    },
    card: {
      padding: 20,
      borderRadius: 16,
    },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
  });
