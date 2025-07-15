import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import CustomButton from '../components/CustomButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

export default function QRGeneratorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitante = route.params?.visitante;

  const [qrValue, setQrValue] = useState('');
  const [nombre, setNombre] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [mensajeQR, setMensajeQR] = useState('');
  const badgeRef = useRef<View>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!visitante) {
        Alert.alert(
          'Visitante no encontrado',
          'No se ha seleccionado un visitante. Vuelve y selecciona uno.',
          [
            {
              text: 'Volver',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return;
      }

      const savedId = await AsyncStorage.getItem('userId');
      if (!savedId) {
        Alert.alert('Error', 'No se pudo obtener tu ID');
        return;
      }

      try {
        const response = await fetch(`${AUTH_BASE_URL}/${savedId}`);
        const text = await response.text();

        try {
          const data = JSON.parse(text);

          if (!response.ok || !data || !data.nombre || !data.numero_casa) {
            Alert.alert('Error', data?.error || 'Perfil incompleto o no encontrado');
            return;
          }

          setNombre(data.nombre);
          setNumeroCasa(data.numero_casa);
        } catch {
          Alert.alert('Error', 'Respuesta inesperada del servidor');
        }
      } catch (error) {
        Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
      }
    };

    cargarDatos();
  }, []);

  const handleGenerarQR = () => {
    if (!nombre || !numeroCasa || !visitante) {
      Alert.alert(
        'Información incompleta',
        'Asegúrate de tener un visitante seleccionado y tu perfil completo'
      );
      return;
    }

    const now = new Date();
    const fechaHoraStr = now.toLocaleString();
    const idUnico = `${now.getTime()}-${Math.floor(Math.random() * 1000)}`;

    const contenidoQR = JSON.stringify({
      idUnico,
      visitanteId: visitante.id,
      nombreResidente: nombre,
      numeroCasa,
      fechaHoraGeneracion: fechaHoraStr,
    });

    setQrValue(contenidoQR);
    setMensajeQR(
      `👤 ${nombre} le ha enviado una invitación de acceso. Presente este pase en vigilancia.`
    );
  };

  const handleCompartirBadge = async () => {
    if (!badgeRef.current) {
      Alert.alert('Primero genera el pase');
      return;
    }

    try {
      const uri = await captureRef(badgeRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir pase de visitante',
      });
    } catch (error) {
      console.error('Error al compartir pase:', error);
      Alert.alert('Error', 'No se pudo compartir el pase');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🎫 Pase de visitante</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          👤 Residente: <Text style={styles.highlight}>{nombre}</Text>
        </Text>
        <Text style={styles.infoText}>
          🏡 Casa: <Text style={styles.highlight}>{numeroCasa}</Text>
        </Text>
        <Text style={styles.infoText}>
          👥 Visitante:{' '}
          <Text style={styles.highlight}>{visitante?.nombre || 'No definido'}</Text>
        </Text>
      </View>

      <CustomButton title="Generar pase" onPress={handleGenerarQR} />

      {qrValue !== '' && (
        <View style={styles.badgeContainer}>
          <View ref={badgeRef} style={styles.badge}>
            <Image
              source={require('../assets/image.png')}
              style={styles.logo}
            />
            <Text style={styles.badgeTitle}>NEIGHNET</Text>
            <QRCode value={qrValue} size={180} />
            <Text style={styles.badgeMessage}>{mensajeQR}</Text>
          </View>
          <CustomButton title="Compartir pase" onPress={handleCompartirBadge} />
        </View>
      )}

      <CustomButton title="Volver" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#f5faff' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e90ff',
    textAlign: 'center',
    marginVertical: 20,
  },
  infoBox: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  infoText: { fontSize: 16, marginBottom: 4 },
  highlight: { fontWeight: 'bold', color: '#2c3e50' },
  badgeContainer: { alignItems: 'center', marginTop: 20 },
  badge: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1e90ff',
    alignItems: 'center',
  },
  logo: { width: 60, height: 60, resizeMode: 'contain' },
  badgeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e90ff',
    marginVertical: 8,
  },
  badgeMessage: {
    marginTop: 12,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
});
