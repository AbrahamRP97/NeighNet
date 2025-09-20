import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Card';
import ScreenBanner from '../components/ScreenBanner';
import * as Linking from 'expo-linking';

export default function ResetPasswordScreen({ navigation: navProp }: any) {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  // Validador: mín. 8, 1 mayúscula, 1 dígito, 1 símbolo
  const validarPass = (p: string) => /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(p);

  // Extrae token desde route.params, query (?token=), o URL inicial del deep link
  useEffect(() => {
    const trySetFromParams = () => {
      // 1) token directo en params
      if (route?.params?.token && String(route.params.token).trim().length > 0) {
        setToken(String(route.params.token));
        return true;
      }

      // 2) a veces React Navigation guarda path/query en params
      const rawPath: string | undefined = route?.params?.path;
      if (rawPath) {
        const m = /(?:\?|&)token=([^&]+)/.exec(rawPath);
        if (m && m[1]) {
          setToken(decodeURIComponent(m[1]));
          return true;
        }
      }
      return false;
    };

    const hydrateFromInitialUrl = async () => {
      // 3) URL inicial (cuando la app se abre por deep link)
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const parsed = Linking.parse(initialUrl);
        // parsed.queryParams?.token cuando la URL es neighnet://reset-password?token=ABC
        const t = (parsed?.queryParams as any)?.token;
        if (t && String(t).trim().length > 0) {
          setToken(String(t));
          return;
        }
        // fallback: regex en toda la URL
        const mr = /(?:\?|&)token=([^&]+)/.exec(initialUrl);
        if (mr && mr[1]) {
          setToken(decodeURIComponent(mr[1]));
        }
      }
    };

    const ok = trySetFromParams();
    if (!ok) {
      // Si no vino en params, intenta desde la URL inicial
      hydrateFromInitialUrl();
    }
  }, [route?.params]);

  const handleReset = async () => {
    if (!token) {
      Alert.alert('Token no encontrado', 'Vuelve a abrir el enlace desde tu correo.');
      return;
    }
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
        Alert.alert('Error', data?.error || 'No se pudo restablecer la contraseña');
      } else {
        Alert.alert('Éxito', 'Contraseña restablecida');
        navigation.replace('Login');
      }
    } catch {
      Alert.alert('Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ScreenBanner title="Restablecer contraseña" onBack={() => navigation.goBack()} />
      <Card>
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
      </Card>
    </ScrollView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 24,
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
    },
  });
