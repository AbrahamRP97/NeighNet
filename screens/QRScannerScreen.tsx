import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable, Platform } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const BACKEND_URL = 'https://neighnet-backend.onrender.com/api/vigilancia/scan';

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      setUserRole(await AsyncStorage.getItem('userRole'));
      setToken(await AsyncStorage.getItem('token'));
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);

    // Solo vigilancia puede escanear
    if (userRole !== 'vigilancia') {
      Alert.alert('Acceso denegado', 'Solo el personal de vigilancia puede escanear QR.');
      setTimeout(() => setScanned(false), 1800);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id_qr: data }), // Solo envía el QR escaneado
      });
      const result = await res.json();

      if (res.ok) {
        if (result.message.includes('Entrada')) {
          Alert.alert('Entrada registrada', 'El visitante ha ingresado.');
        } else if (result.message.includes('Salida')) {
          Alert.alert('Salida registrada', 'El visitante ha salido.');
        } else {
          Alert.alert('Éxito', result.message);
        }
      } else {
        // Error: QR ya usado o inválido
        Alert.alert('Error', result.error || 'QR inválido o ya utilizado');
      }
    } catch (err) {
      Alert.alert('Error', 'Fallo de conexión con el servidor');
    } finally {
      setLoading(false);
      setTimeout(() => setScanned(false), 1800);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Solicitando permiso de cámara...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text>No se otorgó permiso para la cámara</Text>
        <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close-circle" size={36} color="black" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="close-circle" size={36} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    right: 20,
    zIndex: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
});
