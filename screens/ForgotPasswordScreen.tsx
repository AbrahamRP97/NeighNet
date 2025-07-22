import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { AUTH_BASE_URL } from '../api';
import { useTheme } from '../context/ThemeContext';

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
        Alert.alert(
          'Revisa tu correo',
          'Hemos enviado un enlace de recuperación. Ábrelo desde tu dispositivo móvil.'
        );
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar contraseña</Text>

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
          <CustomButton
            title="Enviar enlace de recuperación"
            onPress={handleSendRecovery}
          />
          <CustomButton title="Volver" onPress={() => navigation.goBack()} />
        </>
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
