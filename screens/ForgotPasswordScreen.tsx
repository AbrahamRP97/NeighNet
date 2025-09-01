import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { AUTH_BASE_URL } from '../api';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import ScreenBanner from '../components/ScreenBanner';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const handleSendRecovery = async () => {
    if (!email.includes('@')) {
      Alert.alert('Correo inválido');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${AUTH_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.error || 'No se pudo enviar el correo');
      } else {
        Alert.alert('Revisa tu correo', 'Hemos enviado un enlace de recuperación. Ábrelo desde tu dispositivo móvil.');
        navigation.goBack();
      }
    } catch {
      Alert.alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Banner */}
       <ScreenBanner title="Recuperar contraseña" onBack={() => navigation.goBack()} />

      {/* Card con el formulario */}
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
