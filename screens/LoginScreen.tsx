import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import NetInfo from '@react-native-community/netinfo'; // ✅ Importación de NetInfo

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasEmailError, setHasEmailError] = useState(false);
  const [hasPasswordError, setHasPasswordError] = useState(false);
  const emailRef = useRef(null);

  const validarCorreo = (correo: string) => {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(correo);
  };

  const validarContrasena = (contrasena: string) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(contrasena);
  };

  const handleLogin = async () => {
    // ✅ Verifica conexión antes de continuar
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

    try {
      const response = await fetch(`${AUTH_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email, contrasena: password }),
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Credenciales inválidas');
        return;
      }

      const { usuario } = data;
      console.log('Rol del usuario:', usuario.rol);

      await AsyncStorage.setItem('userId', usuario.id);
      await AsyncStorage.setItem('userName', usuario.nombre);
      await AsyncStorage.setItem('userRole', usuario.rol);

      navigation.replace('Main', { userName: usuario.nombre });
    } catch (error) {
      console.error('Error de red:', error);
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
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

          <CustomButton title="Iniciar sesión" onPress={handleLogin} />
          <CustomButton title="Crear cuenta" onPress={() => navigation.navigate('Registro')} />
          <CustomButton
            title="¿Olvidaste tu contraseña?"
            onPress={() => navigation.navigate('ForgotPassword')}
          />
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
    borderWidth: 2,
    borderColor: '#0077b6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
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
