import React, { useState } from 'react';
import { Text, StyleSheet, Alert, ScrollView, View, TouchableOpacity } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL } from '../api';

export default function RegistroScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cell, setCell] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigation = useNavigation<any>();

  const [hasEmailError, setHasEmailError] = useState(false);
  const [hasPasswordError, setHasPasswordError] = useState(false);
  const [hasConfirmError, setHasConfirmError] = useState(false);

  const isPasswordValid = (password: string): boolean => {
    const minLength = /.{8,}/;
    const hasUpper = /[A-Z]/;
    const hasNumber = /[0-9]/;
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/;

    return (
      minLength.test(password) &&
      hasUpper.test(password) &&
      hasNumber.test(password) &&
      hasSpecial.test(password)
    );
  };

  const handleRegister = async () => {
    let valid = true;

    if (!email.includes('@')) {
      setHasEmailError(true);
      valid = false;
    } else {
      setHasEmailError(false);
    }

    if (!isPasswordValid(password)) {
      setHasPasswordError(true);
      valid = false;
    } else {
      setHasPasswordError(false);
    }

    if (password !== confirmPassword) {
      setHasConfirmError(true);
      valid = false;
    } else {
      setHasConfirmError(false);
    }

    if (!name || !email || !cell || !houseNumber || !password || !confirmPassword) {
      Alert.alert('Todos los campos son obligatorios');
      return;
    }

    if (valid) {
      try {
        const response = await fetch(`${AUTH_BASE_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: name,
            correo: email,
            contrasena: password,
            telefono: cell,
            numero_casa: houseNumber,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          Alert.alert('Error al registrar', data.error || 'Inténtalo nuevamente');
          return;
        }

        await AsyncStorage.setItem('userName', name);
        Alert.alert('¡Registro exitoso!', `Bienvenido/a, ${name}`, [
          {
            text: 'Ir a Login',
            onPress: () => {
              navigation.navigate('Login', { userName: name });
            },
          },
        ]);
      } catch (error) {
        console.error(error);
        Alert.alert('Error de red', 'No se pudo conectar al servidor');
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🎉 Crear cuenta en NeighNet</Text>

      <CustomInput
        placeholder="Nombre completo"
        value={name}
        onChangeText={setName}
      />

      <CustomInput
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        hasError={hasEmailError}
      />

      <CustomInput
        placeholder="Número celular"
        value={cell}
        onChangeText={setCell}
        keyboardType="phone-pad"
      />

      <CustomInput
        placeholder="Número de casa"
        value={houseNumber}
        onChangeText={setHouseNumber}
        keyboardType="number-pad"
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
          La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.
        </Text>
      )}

      <CustomInput
        placeholder="Confirmar contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        hasError={hasConfirmError}
      />

      {hasConfirmError && (
        <Text style={styles.errorText}>Las contraseñas no coinciden.</Text>
      )}

      <CustomButton title="🚀 Registrarse" onPress={handleRegister} />

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Volver al Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  errorText: {
    color: 'red',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
    alignSelf: 'center',
    padding: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
