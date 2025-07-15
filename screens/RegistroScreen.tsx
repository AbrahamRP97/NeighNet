import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { AUTH_BASE_URL } from '../api';
import NetInfo from '@react-native-community/netinfo';

export default function RegistroScreen() {
  const navigation = useNavigation<any>();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);

  const validarCorreo = (correo: string) => /\S+@\S+\.\S+/.test(correo);
  const validarContrasena = (contrasena: string) =>
    /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(contrasena);

  const handleRegistro = async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert('Sin conexión', 'Activa internet antes de registrarte');
      return;
    }

    const correoValido = validarCorreo(correo);
    const contrasenaValida = validarContrasena(contrasena);
    setEmailError(!correoValido);
    setPasswordError(!contrasenaValida);

    if (!correoValido || !contrasenaValida) return;

    if (!nombre || !telefono || !numeroCasa) {
      Alert.alert('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${AUTH_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          correo,
          telefono,
          numero_casa: numeroCasa,
          contrasena,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        Alert.alert('Error', 'Respuesta inválida del servidor');
        return;
      }

      if (!response.ok) {
        Alert.alert('Error', data?.error || 'No se pudo registrar el usuario');
        return;
      }

      Alert.alert('Cuenta creada con éxito', 'Ahora puedes iniciar sesión', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
    } catch (error) {
      console.error('Error de red:', error);
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Crear Cuenta</Text>

        <CustomInput placeholder="Nombre completo" value={nombre} onChangeText={setNombre} />
        <CustomInput
          placeholder="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          hasError={emailError}
        />
        <CustomInput
          placeholder="Teléfono"
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
        />
        <CustomInput
          placeholder="Número de casa"
          value={numeroCasa}
          onChangeText={setNumeroCasa}
          keyboardType="numeric"
        />
        <CustomInput
          placeholder="Contraseña"
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
          hasError={passwordError}
        />

        {passwordError && (
          <Text style={styles.errorText}>
            La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.
          </Text>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#0077b6" />
        ) : (
          <>
            <CustomButton title="Registrarse" onPress={handleRegistro} />
            <CustomButton title="Volver al inicio" onPress={() => navigation.goBack()} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f8f8ff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
});
