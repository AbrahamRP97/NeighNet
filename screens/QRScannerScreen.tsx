import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable, Platform } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';

const BACKEND_URL = 'https://neighnet-backend.onrender.com/api/vigilancia/scan';

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView | null>(null);

  // anti-ráfaga suave
  const scannedRef = useRef(false);
  const lastScanTs = useRef(0);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      setUserRole(await AsyncStorage.getItem('userRole'));
      setToken(await AsyncStorage.getItem('token'));
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      scannedRef.current = false;
      lastScanTs.current = 0;
      setLoading(false);
      setTorchOn(false);
      return () => {
        // no pausamos la preview para evitar "freeze"
      };
    }, [])
  );

  const safeGoBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.getParent?.()?.navigate?.('Inicio');
  };

  const handleBarCodeScanned = useCallback(
    async ({ data }: { type: string; data: string }) => {
      const now = Date.now();
      if (scannedRef.current || now - lastScanTs.current < 900) return;
      lastScanTs.current = now;
      scannedRef.current = true;

      if (userRole !== 'vigilancia') {
        Alert.alert('Acceso denegado', 'Solo el personal de vigilancia puede escanear QR.');
        setTimeout(() => (scannedRef.current = false), 900);
        return;
      }

      // Parseo del QR
      let payload: any;
      try { payload = JSON.parse(data); } catch { payload = { id_qr: data }; }

      const id_qr = String(payload?.id_qr ?? payload?.idUnico ?? '');
      const visitante_id = String(payload?.visitante_id ?? payload?.visitanteId ?? '');
      const expires_at = payload?.expires_at;

      if (!id_qr || !visitante_id) {
        Alert.alert('QR incompleto', 'Faltan id_qr o visitante_id.');
        setTimeout(() => (scannedRef.current = false), 900);
        return;
      }

      const expDate = expires_at ? new Date(expires_at) : null;
      if (!expDate || Number.isNaN(expDate.getTime()) || new Date() > expDate) {
        Alert.alert('QR expirado', 'El pase ya no es válido.');
        setTimeout(() => (scannedRef.current = false), 900);
        return;
      }

      // Deshabilita el handler durante la request (sin pausar la cámara)
      setLoading(true);
      try {
        const res = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ id_qr, visitante_id, expires_at }),
        });
        const result = await res.json();

        if (res.ok) {
          if (result?.message?.includes('Entrada')) {
            Alert.alert('Entrada registrada', 'El visitante ha ingresado.');
          } else if (result?.message?.includes('Salida')) {
            Alert.alert('Salida registrada', 'El visitante ha salido.');
          } else {
            Alert.alert('Éxito', result?.message || 'Operación exitosa');
          }
        } else {
          Alert.alert('Error', result?.error || 'QR inválido/utilizado/expirado');
        }
      } catch {
        Alert.alert('Error', 'Fallo de conexión con el servidor');
      } finally {
        setLoading(false);
        setTimeout(() => { scannedRef.current = false; }, 900);
      }
    },
    [token, userRole]
  );

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
        <Pressable style={styles.closeButton} onPress={safeGoBack}>
          <Ionicons name="close-circle" size={36} color="black" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {isFocused && (
        <CameraView
          key={isFocused ? 'focused' : 'unfocused'}
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          // Plan A estable: sin filtros (si luego te funciona, puedes probar con: barcodeScannerSettings={{ barcodeTypes: ['qr'] }})
          onBarcodeScanned={loading ? undefined : handleBarCodeScanned} // 👈 desactivamos mientras hay request
          autofocus="on"
          zoom={0}
          enableTorch={torchOn}
        />
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Linterna */}
      <Pressable
        style={[styles.fab, { right: 20, bottom: 100 }]}
        onPress={() => setTorchOn(v => !v)}
      >
        <Ionicons name={torchOn ? 'flashlight' : 'flashlight-outline'} size={26} color="#fff" />
      </Pressable>

      {/* Cerrar */}
      <Pressable style={styles.closeButton} onPress={safeGoBack}>
        <Ionicons name="close-circle" size={36} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  fab: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 12,
    borderRadius: 28,
    zIndex: 20,
  },
});
