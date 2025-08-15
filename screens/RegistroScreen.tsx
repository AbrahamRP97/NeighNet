import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import NetInfo from '@react-native-community/netinfo';
import Card from '../components/Card';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../theme';

export default function RegistroScreen() {
  const navigation = useNavigation<any>();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passError, setPassError] = useState(false);
  const [matchError, setMatchError] = useState(false);
  const [loading, setLoading] = useState(false);

  const { theme: t } = useTheme();
  const styles = makeStyles(t);

  const validarCorreo = (c: string) => /\S+@\S+\.\S+/.test(c);
  const validarPass = (p: string) =>
    /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(p);

  const handleRegistro = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert('Sin conexión', 'Activa internet antes de registrarte');
      return;
    }

    const correoOk = validarCorreo(correo);
    const passOk = validarPass(contrasena);
    const matchOk = contrasena === confirmar;
    setEmailError(!correoOk);
    setPassError(!passOk);
    setMatchError(!matchOk);
    if (!correoOk || !passOk || !matchOk) return;

    if (!nombre || !telefono || !numeroCasa) {
      Alert.alert('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${AUTH_BASE_URL}/register`, {
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

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        Alert.alert('Error', 'Respuesta inválida del servidor');
        return;
      }

      if (!res.ok) {
        Alert.alert('Error', data?.error || 'No se pudo registrar');
        return;
      }

      // El backend puede devolver { data: [usuario], token } o { usuario, token }
      const userData = Array.isArray(data?.data) ? data.data[0] : data?.usuario;
      const tokenRaw = data?.token;

      if (userData?.id && userData?.nombre && tokenRaw) {
        // 🔑 Normaliza el token: guarda SOLO el JWT sin 'Bearer '
        const normalizedToken = String(tokenRaw).startsWith('Bearer ')
          ? String(tokenRaw).slice(7).trim()
          : String(tokenRaw).trim();

        await AsyncStorage.setItem('userId', String(userData.id));
        await AsyncStorage.setItem('userName', String(userData.nombre));
        await AsyncStorage.setItem('userRole', String(userData.rol || 'residente'));
        await AsyncStorage.setItem('token', normalizedToken);

        navigation.replace('Main', { userName: userData.nombre });
      } else {
        // Si tu backend no devuelve token/usuario, pide login manual
        Alert.alert('Éxito', 'Cuenta creada. Inicia sesión para continuar.', [
          { text: 'OK', onPress: () => navigation.replace('Login') },
        ]);
      }
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.title}>Crear Cuenta</Text>

          <CustomInput placeholder="Nombre completo" value={nombre} onChangeText={setNombre} />
          <CustomInput
            placeholder="Correo electrónico"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            hasError={emailError}
          />
          <CustomInput placeholder="Teléfono" value={telefono} onChangeText={setTelefono} />
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
            hasError={passError}
          />
          <CustomInput
            placeholder="Confirmar contraseña"
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry
            hasError={matchError}
          />

          {passError && (
            <Text style={styles.errorText}>
              La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.
            </Text>
          )}
          {matchError && <Text style={styles.errorText}>Las contraseñas no coinciden.</Text>}

          {loading ? (
            <ActivityIndicator size="large" color={t.colors.primary} />
          ) : (
            <>
              <CustomButton title="Registrarse" onPress={handleRegistro} />
              <CustomButton title="Volver al inicio" onPress={() => navigation.goBack()} />
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 24,
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    card: {
      padding: 24,
      borderRadius: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      color: theme.colors.text,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
  });
