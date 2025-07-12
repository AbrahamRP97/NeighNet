import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useRoute } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';

export default function ResetPasswordScreen({ navigation }: any) {
  const route = useRoute<any>();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Obtén token del link
    if (route.params?.token) {
      setToken(route.params.token);
    }
  }, [route.params]);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Las contraseñas no coinciden');
      return;
    }

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
        navigation.navigate('Login');
      }
    } catch (err) {
      Alert.alert('Error de red');
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
      <CustomButton title="Cambiar contraseña" onPress={handleReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
});
