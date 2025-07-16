import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { CameraView } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { CameraType } from 'expo-image-picker/build/ImagePicker.types';
import { VIGILANCIA_BASE_URL } from '../api';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../theme';

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

  const { theme: t } = useTheme();
  const styles = makeStyles(t);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (!state.isConnected) {
        Alert.alert('Sin conexión', 'No tienes conexión a internet.');
      }
    });
    return unsub;
  }, []);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={t.colors.primary} />
        <Text style={[styles.loadingText, { color: t.colors.text }]}>
          Solicitando permisos...
        </Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: t.colors.error }]}>
          Permiso para cámara denegado
        </Text>
        <Pressable
          onPress={requestPermission}
          android_ripple={{ color: t.colors.placeholder }}
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.btnText}>Solicitar permiso</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.goBack()}
          android_ripple={{ color: t.colors.placeholder }}
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.btnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: BarCodeScannedType) => {
    setScanned(true);
    setLoading(true);
    let qrData;
    try {
      qrData = JSON.parse(data.trim());
    } catch {
      Alert.alert('QR inválido', 'El código escaneado no es un JSON válido');
      setLoading(false);
      setScanned(false);
      return;
    }
    if (!qrData.idUnico || !qrData.visitanteId) {
      Alert.alert('QR inválido', 'Falta información en el código');
      setLoading(false);
      setScanned(false);
      return;
    }
    try {
      const res = await fetch(`${VIGILANCIA_BASE_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_qr: qrData.idUnico,
          visitante_id: qrData.visitanteId,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        Alert.alert('❌ Error', result.error || 'No se pudo registrar la visita');
      } else {
        const mensaje = result.message.includes('Salida')
          ? '🚪 Salida registrada'
          : '✅ Entrada registrada';
        Alert.alert(mensaje, result.message);
      }
    } catch {
      Alert.alert('Error', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
      setTimeout(() => setScanned(false), 3000);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: t.colors.text }]}>
        📸 Escáner de Código QR
      </Text>
      <View style={styles.cameraContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={[styles.loadingText, { color: '#fff' }]}>
              Procesando escaneo...
            </Text>
          </View>
        )}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={CameraType.back}
          onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <View style={[styles.focusBox, { borderColor: t.colors.primary }]} />
      </View>

      {scanned && !loading && (
        <Pressable
          onPress={() => setScanned(false)}
          android_ripple={{ color: t.colors.placeholder }}
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.btnText}>Escanear otro</Text>
        </Pressable>
      )}
      <Pressable
        onPress={() => navigation.goBack()}
        android_ripple={{ color: t.colors.placeholder }}
        style={({ pressed }) => [styles.btnOutline, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[styles.btnText, { color: t.colors.primary }]}>
          Volver
        </Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 16,
    },
    title: {
      fontSize: 22,
      textAlign: 'center',
      marginVertical: 10,
      fontWeight: '600',
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
      fontSize: theme.fontSize.body,
    },
    errorText: {
      fontSize: theme.fontSize.body,
      marginBottom: 12,
    },
    btn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginVertical: 6,
    },
    btnOutline: {
      borderColor: theme.colors.primary,
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
