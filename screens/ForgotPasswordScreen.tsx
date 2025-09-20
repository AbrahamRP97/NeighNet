import React, { useState } from 'react';
import { StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { AUTH_BASE_URL } from '../api';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Card';
import ScreenBanner from '../components/ScreenBanner';
import NetInfo from '@react-native-community/netinfo';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const validarCorreo = (correo: string) => /\S+@\S+\.\S+/.test(correo);

  const parseJsonSafe = (text: string) => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };

  const handleSendRecovery = async () => {
    // 1) Chequeo de red (evita errores falsos)
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert('Sin conexión', 'Activa tus datos o Wi-Fi antes de continuar.');
      return;
    }

    // 2) Validación básica del correo
    if (!validarCorreo(email)) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s

    try {
      const res = await fetch(`${AUTH_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email.trim() }),
        signal: controller.signal,
      });

      const text = await res.text();
      const data = parseJsonSafe(text) || {};

      if (!res.ok) {
        // Casos comunes: 429 (rate limiter) o 500/502 (hosting)
        if (res.status === 429) {
          Alert.alert(
            'Demasiadas solicitudes',
            data.error || 'Has solicitado demasiados correos en poco tiempo. Intenta más tarde.'
          );
          return;
        }
        // Si el backend devolvió HTML/otro formato, evitamos catch y damos un mensaje claro
        Alert.alert('Error', data.error || `No se pudo enviar el correo (código ${res.status}).`);
        return;
      }

      // Éxito
      Alert.alert(
        'Revisa tu correo',
        'Hemos enviado un enlace de recuperación. Ábrelo desde tu dispositivo móvil.'
      );
      navigation.goBack();
    } catch (e: any) {
      // Abort/timeout u otros errores de red/DNS
      if (e?.name === 'AbortError') {
        Alert.alert('Tiempo de espera agotado', 'Inténtalo de nuevo en unos segundos.');
      } else {
        Alert.alert('Error de conexión', 'No se pudo conectar al servidor.');
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ScreenBanner title="Recuperar contraseña" onBack={() => navigation.goBack()} />
      <Card>
        <CustomInput
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <CustomButton title="Enviar enlace de recuperación" onPress={handleSendRecovery} />
            <CustomButton title="Volver" onPress={() => navigation.goBack()} />
          </>
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
