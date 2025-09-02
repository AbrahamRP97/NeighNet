import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, Alert, Image } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VISITANTES_BASE_URL } from '../api';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { withHaptics, warning, tap, success, error as hError } from '../utils/haptics';

export default function CrearVisitanteScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitante = route.params?.visitante;
  const { theme: t } = useTheme();
  const styles = makeStyles(t);

  const [nombre, setNombre] = useState(visitante?.nombre || '');
  const [identidad, setIdentidad] = useState(visitante?.identidad || '');
  const [placa, setPlaca] = useState(visitante?.placa || '');
  const [marca, setMarca] = useState(visitante?.marca_vehiculo || '');
  const [modelo, setModelo] = useState(visitante?.modelo_vehiculo || '');
  const [color, setColor] = useState(visitante?.color_vehiculo || '');

  const handleGuardar = async () => {
  if (!nombre || !identidad || !placa || !marca || !modelo || !color) {
    warning();
    return Alert.alert('Todos los campos son obligatorios');
  }

  const token = await AsyncStorage.getItem('token');
  if (!token) {
    hError();
    return Alert.alert('Sesión', 'No se encontró el token de sesión.');
  }

  const url = visitante ? `${VISITANTES_BASE_URL}/${visitante.id}` : VISITANTES_BASE_URL;
  const method = visitante ? 'PUT' : 'POST';

  const payload = {
    nombre,
    identidad,
    placa,
    marca_vehiculo: marca,
    modelo_vehiculo: modelo,
    color_vehiculo: color,
  };

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) throw new Error(data?.error || 'No se pudo guardar');

    success(); // ✅
    Alert.alert(
      visitante ? 'Actualizado' : 'Creado',
      'Operación exitosa',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  } catch (e: any) {
    const msg = e?.message?.includes('conectar') ? 'Error de conexión' : e?.message || 'Error';
    hError(); // ❌
    Alert.alert('Error', msg);
  }
};


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: t.colors.background }}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Banner */}
        <LinearGradient
          colors={[t.colors.primary, t.colors.accent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <Image source={require('../assets/image.png')} style={styles.logo} />
          <Text style={styles.bannerTitle}>{visitante ? 'Editar visitante' : 'Agregar visitante'}</Text>
          <Text style={styles.bannerSubtitle}>Completa los datos del visitante</Text>
        </LinearGradient>

        <Card>
          <CustomInput placeholder="Nombre completo" value={nombre} onChangeText={setNombre} />
          <CustomInput placeholder="Número de identidad" value={identidad} onChangeText={setIdentidad} keyboardType="number-pad" />
          <CustomInput placeholder="Placa del vehículo" value={placa} onChangeText={setPlaca} />
          <CustomInput placeholder="Marca del vehículo" value={marca} onChangeText={setMarca} />
          <CustomInput placeholder="Modelo del vehículo" value={modelo} onChangeText={setModelo} />
          <CustomInput placeholder="Color del vehículo" value={color} onChangeText={setColor} />
          <CustomButton title={visitante ? 'Actualizar visitante' : 'Registrar visitante'} onPress={withHaptics(handleGuardar, 'tap')} />
          <CustomButton title="Volver" onPress={withHaptics(() => navigation.goBack(), 'tap')} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flexGrow: 1, padding: 24, backgroundColor: theme.colors.background, justifyContent: 'center' },
    banner: {
      borderRadius: 20,
      paddingVertical: 22,
      paddingHorizontal: 18,
      marginBottom: 16,
      alignItems: 'center',
    },
    bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 10, textAlign: 'center' },
    bannerSubtitle: { color: '#fff', opacity: 0.9, marginTop: 4, fontSize: 13, textAlign: 'center' },
    logo: { width: 64, height: 64, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  });
