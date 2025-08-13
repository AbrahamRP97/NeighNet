import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  Alert,
} from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VISITANTES_BASE_URL } from '../api';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';

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
      return Alert.alert('Todos los campos son obligatorios');
    }

    const token = await AsyncStorage.getItem('token');
    if (!token) return Alert.alert('Sesión', 'No se encontró el token de sesión.');

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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar');

      Alert.alert(
        visitante ? 'Actualizado' : 'Creado',
        'Operación exitosa',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message?.includes('conectar') ? 'Error de conexión' : e?.message || 'Error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: t.colors.background }}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <Text style={styles.title}>{visitante ? 'Editar visitante' : 'Agregar visitante'}</Text>
          <CustomInput placeholder="Nombre completo" value={nombre} onChangeText={setNombre} />
          <CustomInput placeholder="Número de identidad" value={identidad} onChangeText={setIdentidad} keyboardType="number-pad" />
          <CustomInput placeholder="Placa del vehículo" value={placa} onChangeText={setPlaca} />
          <CustomInput placeholder="Marca del vehículo" value={marca} onChangeText={setMarca} />
          <CustomInput placeholder="Modelo del vehículo" value={modelo} onChangeText={setModelo} />
          <CustomInput placeholder="Color del vehículo" value={color} onChangeText={setColor} />
          <CustomButton title={visitante ? 'Actualizar visitante' : 'Registrar visitante'} onPress={handleGuardar} />
          <CustomButton title="Volver" onPress={() => navigation.goBack()} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flexGrow: 1, padding: 24, backgroundColor: theme.colors.background },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: theme.colors.primary },
  });
