import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, KeyboardAvoidingView,
  Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import NetInfo from '@react-native-community/netinfo';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasEmailError, setHasEmailError] = useState(false);
  const [hasPasswordError, setHasPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);

  const validarCorreo = (correo: string) => /\S+@\S+\.\S+/.test(correo);
  const validarContrasena = (contrasena: string) =>
    /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(contrasena);

  const handleLogin = async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert('Sin conexión', 'Activa tus datos o Wi-Fi antes de iniciar sesión.');
      return;
    }

    const correoValido = validarCorreo(email);
    const contrasenaValida = validarContrasena(password);
    setHasEmailError(!correoValido);
    setHasPasswordError(!contrasenaValida);
    if (!correoValido || !contrasenaValida) return;

    setLoading(true);
    try {
      const response = await fetch(`${AUTH_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email, contrasena: password }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        Alert.alert('Error', 'Respuesta inesperada del servidor');
        return;
      }

      if (!response.ok) {
        Alert.alert('Error', data?.error || 'Credenciales inválidas');
        return;
      }

      const { usuario } = data;
      if (!usuario || !usuario.id || !usuario.nombre) {
        Alert.alert('Error', 'Datos del usuario incompletos');
        return;
      }

      await AsyncStorage.setItem('userId', usuario.id);
      await AsyncStorage.setItem('userName', usuario.nombre);
      await AsyncStorage.setItem('userRole', usuario.rol || 'residente');

      navigation.replace('Main', { userName: usuario.nombre });
    } catch (error) {
      console.error('Error de red:', error);
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f0f4f8' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
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
            <ActivityIndicator size="large" color="#0077b6" />
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f0f4f8',
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
});
