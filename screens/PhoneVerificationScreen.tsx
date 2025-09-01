import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, Platform, Image, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { AUTH_BASE_URL } from '../api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../components/Card';

export default function PhoneVerificationScreen() {
  const { theme } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const userId = route.params?.userId;
  const telefono = route.params?.telefono;
  const autoresend = route.params?.autoresend ?? true;

  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (autoresend && userId) {
      sendCode();
    }
  }, [autoresend, userId]);

  const sendCode = async () => {
    if (!userId) {
      Alert.alert('Error', 'Falta userId para enviar el código.');
      return;
    }
    try {
      setResendIn(30);
      const res = await fetch(`${AUTH_BASE_URL}/phone/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo enviar el código');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar el código');
      setResendIn(0);
    }
  };

  const onVerify = async () => {
    if (!userId) {
      Alert.alert('Error', 'Falta userId para verificar.');
      return;
    }
    if (!code || code.length < 4) {
      Alert.alert('Código incompleto', 'Ingresa el código que recibiste por SMS');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${AUTH_BASE_URL}/phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo verificar');
      Alert.alert('Listo', 'Tu teléfono fue verificado correctamente', [
        { text: 'Continuar', onPress: () => navigation.replace('Login') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Código inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  const onResend = () => {
    if (resendIn > 0) return;
    sendCode();
  };

  const onCancel = () => {
    Alert.alert(
      'Cancelar verificación',
      'Puedes verificar más tarde desde el inicio de sesión. ¿Deseas volver al inicio?',
      [
        { text: 'No' },
        { text: 'Sí', style: 'destructive', onPress: () => navigation.replace('Login') },
      ]
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        {/* Banner con gradiente */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <View style={styles.bannerRow}>
            <View style={{ width: 28 }} />
            <Text style={styles.bannerTitle}>Verifica tu teléfono</Text>
            <Pressable onPress={onCancel} hitSlop={10} style={styles.bannerClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.bannerSubtitle}>Enviamos un código por SMS al {telefono || 'tu número'}.</Text>
        </LinearGradient>

        {/* Card de verificación */}
        <Card style={{ padding: 20, borderRadius: 16 }}>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: theme.colors.placeholder,
                backgroundColor: theme.colors.card,
              },
            ]}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="Ingresa el código"
            placeholderTextColor={theme.colors.placeholder}
          />

          <Pressable onPress={onVerify} style={[styles.btn, { backgroundColor: theme.colors.primary }]} disabled={loading}>
            <Text style={[styles.btnText, { color: theme.colors.textContrast }]}>{loading ? 'Verificando…' : 'Verificar'}</Text>
          </Pressable>

          <Pressable onPress={onResend} disabled={resendIn > 0} style={styles.link}>
            <Text style={{ color: resendIn > 0 ? theme.colors.placeholder : theme.colors.primary }}>
              {resendIn > 0 ? `Reenviar en ${resendIn}s` : 'Reenviar código'}
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerSubtitle: { color: '#fff', opacity: 0.9, marginTop: 6, fontSize: 13, textAlign: 'center' },

  input: { height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 18, marginBottom: 16 },
  btn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  link: { marginTop: 12, alignItems: 'center' },

  bannerClose: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)' },
});
