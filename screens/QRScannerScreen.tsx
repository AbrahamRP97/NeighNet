import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable, Platform, Animated } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { VIGILANCIA_BASE_URL } from '../api';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { tap, success, warning, error as hError } from '../utils/haptics';
import * as ScreenCapture from 'expo-screen-capture';

type FeedbackType = 'success' | 'error' | null;

export default function QRScannerScreen() {
  const { theme } = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>(null);

  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView | null>(null);

  const scannedRef = useRef(false);
  const lastScanTs = useRef(0);

  // animación para el overlay de feedback
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const playFeedbackAnim = (type: FeedbackType) => {
    setFeedback(type);
    scaleAnim.setValue(0.8);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          setFeedback(null);
        });
      }, 700);
    });
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      const [role, tk] = await Promise.all([
        AsyncStorage.getItem('userRole'),
        AsyncStorage.getItem('token'),
      ]);
      setUserRole(role);
      setToken(tk);
    })();
  }, []);

  // 🔒 Bloqueo de capturas mientras esta pantalla está enfocada
  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;
      lastScanTs.current = 0;
      setLoading(false);
      setTorchOn(false);
      setFeedback(null);

      let sub: any;
      (async () => {
        try { await ScreenCapture.preventScreenCaptureAsync(); } catch {}
      })();
      try {
        sub = ScreenCapture.addScreenshotListener(() => {
          Alert.alert('Bloqueado', 'Por seguridad, las capturas de pantalla están deshabilitadas en esta pantalla.');
        });
      } catch {}

      return () => {
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
        sub?.remove?.();
      };
    }, [])
  );

  const safeGoBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.getParent?.()?.navigate?.('Inicio');
  };

  const isGuard = (role: string | null) =>
    role === 'vigilancia' || role === 'admin';

  // Detección de QR firmado
  const parseQr = (data: string) => {
    // 1) Intentar JSON (v2 con envelope o v1 plain)
    try {
      const obj = JSON.parse(data);
      if (obj?.envelope || obj?.env) {
        return { mode: 'signed', envelope: obj.envelope ?? obj.env, raw: obj };
      }
      return { mode: 'plain', ...obj };
    } catch {
      // 2) Si no es JSON, detectar JWT compacto (header.payload.signature)
      const compactJwt = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
      if (compactJwt.test((data || '').trim())) {
        return { mode: 'signed', envelope: (data || '').trim() };
      }
      // 3) Caso legacy: id_qr simple
      return { mode: 'plain', id_qr: data };
    }
  };

  const sendScanRequest = async (body: any, tk: string, preferSigned: boolean) => {
    // Si es firmado, probamos /scan-signed y fallback a /scan
    if (preferSigned) {
      try {
        const r1 = await fetch(`${VIGILANCIA_BASE_URL}/scan-signed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tk}`,
          },
          body: JSON.stringify(body),
        });
        if (r1.ok) return r1;
        // si el endpoint no existe o falla, probamos /scan
      } catch {}
    }
    // fallback general
    return fetch(`${VIGILANCIA_BASE_URL}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tk}`,
      },
      body: JSON.stringify(body),
    });
  };

  const handleBarCodeScanned = useCallback(
    async ({ data }: { type: string; data: string }) => {
      const now = Date.now();
      if (scannedRef.current || now - lastScanTs.current < 900) return;
      lastScanTs.current = now;
      scannedRef.current = true;

      if (!isGuard(userRole)) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playFeedbackAnim('error');
        warning();
        Alert.alert('Acceso denegado', 'Solo vigilancia o admin pueden escanear QR.');
        setTimeout(() => (scannedRef.current = false), 900);
        return;
      }
      if (!token) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playFeedbackAnim('error');
        warning();
        Alert.alert('Sesión', 'No hay token de sesión. Inicia sesión nuevamente.');
        setTimeout(() => (scannedRef.current = false), 900);
        return;
      }

      const parsed = parseQr(data);
      const isSigned = parsed.mode === 'signed';

      // Validaciones locales mínimas para modo "plain" (compatibilidad)
      if (!isSigned) {
        const id_qr = String(parsed?.id_qr ?? parsed?.idUnico ?? '');
        const visitante_id = String(parsed?.visitante_id ?? parsed?.visitanteId ?? '');
        const expires_at = parsed?.expires_at;

        if (!id_qr || !visitante_id) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          playFeedbackAnim('error');
          warning();
          Alert.alert('QR incompleto', 'Faltan id_qr o visitante_id.');
          setTimeout(() => (scannedRef.current = false), 900);
          return;
        }

        const expDate = expires_at ? new Date(expires_at) : null;
        if (!expDate || Number.isNaN(expDate.getTime()) || new Date() > expDate) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          playFeedbackAnim('error');
          warning();
          Alert.alert('QR expirado', 'El pase ya no es válido.');
          setTimeout(() => (scannedRef.current = false), 900);
          return;
        }
      }

      setLoading(true);
      try {
        let body: any;
        if (isSigned) {
          // enviar envelope "tal cual"
          body = { envelope: parsed.envelope };
        } else {
          // enviar los campos tradicionales
          body = {
            id_qr: String(parsed?.id_qr ?? parsed?.idUnico ?? ''),
            visitante_id: String(parsed?.visitante_id ?? parsed?.visitanteId ?? ''),
            expires_at: parsed?.expires_at,
          };
        }

        const res = await sendScanRequest(body, token!, isSigned);
        const result = await res.json().catch(() => ({}));

        if (res.ok) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          playFeedbackAnim('success');

          if (result?.message?.includes('Entrada')) {
            success();
            const visitaId = result?.data?.id;
            if (!visitaId) {
              warning();
              Alert.alert('Atención', 'Entrada registrada, pero no se obtuvo ID de visita.');
            } else {
              navigation.navigate('EvidenceCapture', { visitaId });
              return;
            }
          } else if (result?.message?.includes('Salida')) {
            success();
            Alert.alert('Salida registrada', 'El visitante ha salido.');
          } else {
            tap();
            Alert.alert('Éxito', result?.message || 'Operación exitosa');
          }
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          playFeedbackAnim('error');
          hError();
          Alert.alert('Error', result?.error || 'QR inválido/utilizado/expirado');
        }
      } catch {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playFeedbackAnim('error');
        hError();
        Alert.alert('Error', 'Fallo de conexión con el servidor');
      } finally {
        setLoading(false);
        setTimeout(() => { scannedRef.current = false; }, 900);
      }
    },
    [token, userRole, navigation]
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
      {/* Header con gradiente */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerBar}
      >
        <Text style={styles.headerTitle}>Escanear QR</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.fab, { right: 20, bottom: 100 }]}
            onPress={() => { tap(); setTorchOn(v => !v); }}
          >
            <Ionicons name={torchOn ? 'flashlight' : 'flashlight-outline'} size={26} color="#fff" />
          </Pressable>
          <Pressable onPress={safeGoBack} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {isFocused && (
        <CameraView
          key={isFocused ? 'focused' : 'unfocused'}
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={loading ? undefined : handleBarCodeScanned}
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

      {/* Feedback overlay ✅ / ❌ */}
      {!!feedback && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.feedbackOverlay,
            {
              backgroundColor: feedback === 'success' ? 'rgba(30, 200, 120, 0.22)' : 'rgba(220, 38, 38, 0.22)',
              opacity: opacityAnim,
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name={feedback === 'success' ? 'checkmark-circle' : 'close-circle'}
              size={120}
              color={feedback === 'success' ? '#22C55E' : '#EF4444'}
            />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingTop: Platform.select({ ios: 54, android: 24 }),
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerActions: { marginLeft: 'auto', flexDirection: 'row' },
  headerBtn: { marginLeft: 14, padding: 6 },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    right: 20,
    zIndex: 20,
  },
  fab: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 26,
  },
});
