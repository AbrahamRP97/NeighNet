import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useRoute } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Card';
import ScreenBanner from '../components/ScreenBanner';

export default function ResetPasswordScreen({ navigation }: any) {
  const route = useRoute<any>();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  useEffect(() => {
    if (route.params?.token) {
      setToken(route.params.token);
    } else if (route?.params) {
      const match = /token=([^&]+)/.exec(route?.params?.path || '');
      if (match) setToken(match[1]);
    }
  }, [route.params]);

  const validarPass = (p: string) => /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(p);

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
      Alert.alert('Contraseña insegura', 'Debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.');
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
    } catch {
      Alert.alert('Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Banner */}
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
    banner: {
      borderRadius: 20,
      paddingVertical: 18,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    bannerBack: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
  });
