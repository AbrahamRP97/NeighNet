import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VISITANTES_BASE_URL } from '../api';

export default function CrearVisitanteScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitante = route.params?.visitante;

  const [nombre, setNombre] = useState(visitante?.nombre || '');
  const [identidad, setIdentidad] = useState(visitante?.identidad || '');
  const [placa, setPlaca] = useState(visitante?.placa || '');
  const [marca, setMarca] = useState(visitante?.marca_vehiculo || '');
  const [modelo, setModelo] = useState(visitante?.modelo_vehiculo || '');
  const [color, setColor] = useState(visitante?.color_vehiculo || '');

  const handleGuardar = async () => {
    if (!nombre || !identidad || !placa || !marca || !modelo || !color) {
      Alert.alert('Todos los campos son obligatorios');
      return;
    }

    const residenteId = await AsyncStorage.getItem('userId');
    if (!residenteId) {
      Alert.alert('Error', 'No se pudo obtener tu ID');
      return;
    }

    const url = visitante
      ? `${VISITANTES_BASE_URL}/${visitante.id}`
      : VISITANTES_BASE_URL;

    const method = visitante ? 'PUT' : 'POST';

    const payload = {
      residente_id: residenteId,
      nombre,
      identidad,
      placa,
      marca_vehiculo: marca,
      modelo_vehiculo: modelo,
      color_vehiculo: color,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const data = JSON.parse(text);

      if (!response.ok) {
        Alert.alert('Error', data.error || 'No se pudo guardar el visitante');
        return;
      }

      Alert.alert(
        visitante ? 'Visitante actualizado' : 'Visitante creado',
        'Operación exitosa',
        [{ text: 'OK', onPress: () => navigation.replace('Visitantes') }]
      );
    } catch {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {visitante ? 'Editar visitante' : 'Agregar visitante'}
      </Text>

      <CustomInput placeholder="Nombre completo" value={nombre} onChangeText={setNombre} />
      <CustomInput placeholder="Número de identidad" value={identidad} onChangeText={setIdentidad} keyboardType="number-pad" />
      <CustomInput placeholder="Placa del vehículo" value={placa} onChangeText={setPlaca} />
      <CustomInput placeholder="Marca del vehículo" value={marca} onChangeText={setMarca} />
      <CustomInput placeholder="Modelo del vehículo" value={modelo} onChangeText={setModelo} />
      <CustomInput placeholder="Color del vehíc" value={color} onChangeText={setColor} />

      <CustomButton
        title={visitante ? 'Actualizar visitante' : 'Registrar visitante'}
        onPress={handleGuardar}
      />
      <CustomButton title="Volver" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f9fafe',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2c3e50',
  },
});