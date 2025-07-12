import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { CameraView } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { CameraType } from 'expo-image-picker/build/ImagePicker.types';
import { VIGILANCIA_BASE_URL } from '../api';

type BarCodeScannedType = {
  type: string;
  data: string;
};

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation<any>();

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Solicitando permisos...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Permiso para cámara denegado</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Solicitar permiso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: BarCodeScannedType) => {
    setScanned(true);
    setLoading(true);
    console.log('QR raw:', data);

    let qrData;
    try {
      qrData = JSON.parse(data.trim());
    } catch (err) {
      console.error('Error parseando QR:', err);
      Alert.alert('QR inválido', 'El código escaneado no es un JSON válido');
      setScanned(false);
      setLoading(false);
      return;
    }

    if (!qrData.idUnico || !qrData.visitanteId) {
      console.warn('QR incompleto:', qrData);
      Alert.alert('QR inválido', 'El código no tiene la información esperada');
      setScanned(false);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${VIGILANCIA_BASE_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_qr: qrData.idUnico,
          visitante_id: qrData.visitanteId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        Alert.alert('❌ Error', result.error || 'No se pudo registrar la visita');
      } else {
        let title = '✅ Visita registrada';
        if (result.message.includes('Entrada')) {
          title = '🚪 Ingreso registrado';
        } else if (result.message.includes('Salida')) {
          title = '🚪 Salida registrada';
        }
        Alert.alert(title, result.message);
      }
    } catch (error) {
      console.error('Error al procesar QR:', error);
      Alert.alert('Error', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
      setTimeout(() => setScanned(false), 3000); // Permitir nuevo escaneo tras 3 seg
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📸 Escáner de Código QR</Text>
      <View style={styles.cameraContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Procesando escaneo...</Text>
          </View>
        )}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={CameraType.back}
          onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <View style={styles.focusBox} />
      </View>

      {scanned && !loading && (
        <TouchableOpacity style={styles.btn} onPress={() => setScanned(false)}>
          <Text style={styles.btnText}>Escanear otro</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.goBack()}>
        <Text style={[styles.btnText, { color: '#3498db' }]}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef7fc',
    padding: 16,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 12,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  focusBox: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: '70%',
    height: '40%',
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#fff',
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 12,
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  btnOutline: {
    borderColor: '#3498db',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
