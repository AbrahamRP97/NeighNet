import React, { useState } from 'react';
import { Text, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import NetInfo from '@react-native-community/netinfo';
import Card from '../components/Card';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

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

  // --- Normalizadores ---
  const stripSeparatorsKeepPlus = (v: string) => {
    if (!v) return '';
    let s = v.replace(/[^\d+]/g, '');
    if (s.startsWith('+')) s = '+' + s.slice(1).replace(/\+/g, '');
    else s = s.replace(/\+/g, '');
    return s;
  };

  const ensureHNPrefixOnSubmit = (v: string) => {
    if (!v) return v;
    if (v.startsWith('+')) return v;
    const onlyDigits = v.replace(/\D/g, '');
    if (onlyDigits.length === 8) return `+504${onlyDigits}`;
    return v;
  };

  const validarCorreo = (c: string) => /\S+@\S+\.\S+/.test(c);
  const validarPass = (p: string) => /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(p);

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

    let telefonoClean = stripSeparatorsKeepPlus(telefono);
    telefonoClean = ensureHNPrefixOnSubmit(telefonoClean);
    if (telefonoClean !== telefono) setTelefono(telefonoClean);

    setLoading(true);
    try {
      const res = await fetch(`${AUTH_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          correo,
          telefono: telefonoClean,
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

      const userData = data?.usuario;
      if (userData?.id) {
        await AsyncStorage.setItem('pendingVerifyUserId', String(userData.id));
        Alert.alert(
          'Verificación requerida',
          'Te enviamos un código por SMS. Ingrésalo para activar tu cuenta.',
          [{ text: 'Continuar', onPress: () => navigation.replace('PhoneVerification', { userId: userData.id, telefono: telefonoClean }) }]
        );
      } else {
        Alert.alert('Éxito', 'Cuenta creada. Verifica tu teléfono para continuar.', [
          { text: 'OK', onPress: () => navigation.replace('PhoneVerification', { telefono: telefonoClean }) },
        ]);
      }
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneBlur = () => {
    const cleaned = stripSeparatorsKeepPlus(telefono);
    if (cleaned !== telefono) setTelefono(cleaned);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Banner en gradiente */}
        <LinearGradient
          colors={[t.colors.primary, t.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <Image source={require('../assets/image.png')} style={styles.logo} />
          <Text style={styles.bannerTitle}>Crear cuenta</Text>
          <Text style={styles.bannerSubtitle}>Regístrate para empezar</Text>
        </LinearGradient>

        <Card style={styles.card}>
          <CustomInput placeholder="Nombre completo" value={nombre} onChangeText={setNombre} />

          <CustomInput
            placeholder="Correo electrónico"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            hasError={emailError}
          />

          <CustomInput
            placeholder="Teléfono (ej: +50432448919, sin espacios ni guiones)"
            value={telefono}
            onChangeText={(txt) => setTelefono(stripSeparatorsKeepPlus(txt))}
            onBlur={handlePhoneBlur}
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
    banner: {
      borderRadius: 20,
      paddingVertical: 22,
      paddingHorizontal: 18,
      marginBottom: 16,
      alignItems: 'center',
    },
    bannerTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '800',
      marginTop: 10,
    },
    bannerSubtitle: {
      color: '#fff',
      opacity: 0.9,
      marginTop: 4,
      fontSize: 13,
      textAlign: 'center',
    },
    card: {
      padding: 20,
      borderRadius: 16,
    },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.15)',
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
