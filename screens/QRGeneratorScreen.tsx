import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import CustomButton from '../components/CustomButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import NetInfo from '@react-native-community/netinfo';

export default function QRGeneratorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitante = route.params?.visitante;

  if (!visitante) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error</Text>
      <Text style={styles.description}>No se ha seleccionado un visitante. Por favor, vuelve atrás.</Text>
      <CustomButton title="Volver" onPress={() => navigation.goBack()} />
    </View>
  );
}

  const [qrValue, setQrValue] = useState('');
  const [nombre, setNombre] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [mensajeQR, setMensajeQR] = useState('');
  const badgeRef = useRef<View>(null);

   // 🔐 Verifica conexión
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!state.isConnected) {
        Alert.alert('Sin conexión', 'No tienes conexión a internet.');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      const savedId = await AsyncStorage.getItem('userId');

      if (!savedId) {
        Alert.alert('Error', 'No se pudo obtener tu ID');
        return;
      }

      try {
        const response = await fetch(`${AUTH_BASE_URL}/${savedId}`);
        const data = await response.json();

        if (response.ok) {
          setNombre(data.nombre);
          setNumeroCasa(data.numero_casa || '');
        } else {
          Alert.alert('Error', data.error || 'No se pudo cargar el perfil');
        }
      } catch (error) {
        Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
      }
    };

    cargarDatos();
  }, []);

  const handleGenerarQR = () => {
    if (!nombre || !numeroCasa || !visitante) {
      Alert.alert('Información incompleta', 'Asegúrate de tener un visitante seleccionado y tu perfil completo');
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

    console.log('QR generado:', contenidoQR);
    setQrValue(contenidoQR);
    setMensajeQR(`👤 ${nombre} le ha enviado una invitación de acceso. Presente este pase en vigilancia.`);
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
        <Text style={styles.infoText}>👤 Residente: <Text style={styles.highlight}>{nombre}</Text></Text>
        <Text style={styles.infoText}>🏡 Casa: <Text style={styles.highlight}>{numeroCasa}</Text></Text>
        <Text style={styles.infoText}>👥 Visitante: <Text style={styles.highlight}>{visitante?.nombre}</Text></Text>
      </View>

      <CustomButton title="Generar pase" onPress={handleGenerarQR} />

      {qrValue !== '' && (
        <View style={styles.badgeContainer}>
          <View ref={badgeRef} style={styles.badge}>
            <Image source={require('../assets/image.png')} style={styles.logo} />
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e90ff', textAlign: 'center', marginVertical: 20 },
  infoBox: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, marginBottom: 20 },
  infoText: { fontSize: 16, marginBottom: 4 },
  highlight: { fontWeight: 'bold', color: '#2c3e50' },
  badgeContainer: { alignItems: 'center', marginTop: 20 },
  badge: { padding: 20, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: '#1e90ff', alignItems: 'center' },
  logo: { width: 60, height: 60, resizeMode: 'contain' },
  badgeTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e90ff', marginVertical: 8 },
  description: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 20 },
  badgeMessage: { marginTop: 12, fontSize: 14, color: '#333', textAlign: 'center' },
});
