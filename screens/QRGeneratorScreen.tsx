import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import CustomButton from '../components/CustomButton';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { AUTH_BASE_URL, PASSES_BASE_URL } from '../api';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenCapture from 'expo-screen-capture';

const EXPIRATION_HOURS = 24;

type Visitante = {
  id: string;
  nombre: string;
  identidad?: string;
};

type Envelope =
  | string
  | {
      alg?: string;
      kid?: string;
      payload?: string;
      sig?: string;
      [k: string]: any;
    };

export default function QRGeneratorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitante: Visitante | undefined = route.params?.visitante;

  const badgeRef = useRef<View>(null);
  const invisibleBadgeRef = useRef<View>(null);
  const qrRef = useRef<any>(null);
  const [qrValue, setQrValue] = useState('');
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [mensajeQR, setMensajeQR] = useState('');
  const [loadingQR, setLoadingQR] = useState(false);

  const { theme } = useTheme();

  // 🔒 Bloqueo de capturas mientras esta pantalla está enfocada
  useFocusEffect(
    useCallback(() => {
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

  useEffect(() => {
    if (!visitante) {
      Alert.alert(
        'Visitante no encontrado',
        'No se ha seleccionado un visitante. Vuelve y selecciona uno.',
        [{ text: 'Volver', onPress: () => navigation.goBack() }]
      );
      return;
    }
    (async () => {
      const [savedId, token] = await Promise.all([
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('token'),
      ]);
      if (!savedId) {
        Alert.alert('Error', 'No se pudo obtener tu ID');
        return;
      }
      try {
        const response = await fetch(`${AUTH_BASE_URL}/${savedId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        if (!response.ok || !data?.nombre || !data?.numero_casa) {
          Alert.alert('Error', data?.error || 'Perfil incompleto o no encontrado');
          return;
        }
        setNombre(data.nombre);
        setNumeroCasa(data.numero_casa);
      } catch {
        Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
      }
    })();
  }, []);

  // --- Generación de QR firmado (si el backend lo soporta) ---
  const tryCreateSignedPass = async (): Promise<{
    envelope?: Envelope;
    id_qr?: string;
    visitante_id?: string;
    issued_at?: string;
    expires_at?: string;
  } | null> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return null;

      const res = await fetch(`${PASSES_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          visitante_id: visitante?.id,
          ttl_hours: EXPIRATION_HOURS,
          meta: { nombreResidente: nombre, numeroCasa },
        }),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) return null;

      // Aceptamos varios formatos de respuesta comunes
      const envelope: Envelope =
        data?.envelope ?? data?.env ?? data?.qrEnvelope ?? null;

      return {
        envelope: envelope ?? null,
        id_qr: data?.pass?.id_qr ?? data?.id_qr,
        visitante_id: data?.pass?.visitante_id ?? data?.visitante_id,
        issued_at: data?.pass?.issued_at ?? data?.issued_at,
        expires_at: data?.pass?.expires_at ?? data?.expires_at,
      };
    } catch {
      return null;
    }
  };

  const handleGenerarQR = async () => {
    if (!nombre || !numeroCasa || !visitante) {
      Alert.alert(
        'Información incompleta',
        'Asegúrate de tener un visitante seleccionado y tu perfil completo'
      );
      return;
    }

    setLoadingQR(true);
    setQrBase64(null);
    setQrValue('');

    // 1) Intentar modo firmado
    const signed = await tryCreateSignedPass();

    if (signed?.envelope) {
      // QR FIRMA: compactamos con una estructura mínima y versionada
      const qrPayload = JSON.stringify({
        v: 2,
        typ: 'NNP/1', // tipo propio (NeighNet Pass v1)
        envelope: signed.envelope, // puede ser string o { alg, kid, payload, sig }
      });

      setQrValue(qrPayload);

      const expText =
        signed?.expires_at
          ? new Date(signed.expires_at).toLocaleString()
          : 'próximas 24h';
      setMensajeQR(`👤 ${nombre} le ha enviado una invitación de acceso. Vigente hasta ${expText}.`);
    } else {
      // 2) Fallback: modo actual SIN firma
      const now = new Date();
      const expires = new Date(now.getTime() + EXPIRATION_HOURS * 60 * 60 * 1000);
      const id_qr = `${now.getTime()}-${Math.floor(Math.random() * 1000)}`;
      const contenidoQR = JSON.stringify({
        v: 1,
        id_qr,
        visitante_id: visitante.id,
        issued_at: now.toISOString(),
        expires_at: expires.toISOString(),
        meta: { nombreResidente: nombre, numeroCasa },
      });
      setQrValue(contenidoQR);
      setMensajeQR(
        `👤 ${nombre} le ha enviado una invitación de acceso. Vigente hasta ${expires.toLocaleString()}.`
      );
    }

    // Convertimos a base64 cuando el QR esté listo
    setTimeout(() => {
      if (qrRef.current) {
        qrRef.current.toDataURL((data: string) => {
          setQrBase64(data);
          setLoadingQR(false);
        });
      } else {
        setLoadingQR(false);
      }
    }, 500);
  };

  const handleCompartirBadge = async () => {
    if (!qrBase64) {
      Alert.alert('Primero genera el pase y espera que aparezca el QR');
      return;
    }
    try {
      const uri = await captureRef(invisibleBadgeRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir pase de visitante',
      });
    } catch {
      Alert.alert('Error', 'No se pudo compartir el pase');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background }
      ]}
    >
      {/* Banner con gradiente */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <Text style={styles.bannerTitle}>🎫 Pase de visitante</Text>
      </LinearGradient>

      <Card style={styles.card}>
        <View style={styles.infoBox}>
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            👤 Residente: <Text style={[styles.highlight, { color: theme.colors.primary }]}>{nombre}</Text>
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            🏡 Casa: <Text style={[styles.highlight, { color: theme.colors.primary }]}>{numeroCasa}</Text>
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            👥 Visitante:{' '}
            <Text style={[styles.highlight, { color: theme.colors.primary }]}>
              {visitante?.nombre || 'No definido'}
            </Text>
          </Text>
        </View>
      </Card>

      <CustomButton title="Generar pase" onPress={handleGenerarQR} />

      {/* Contenedor del QR */}
      {qrValue !== '' && (
        <Card style={styles.card}>
          <View
            ref={badgeRef}
            style={[
              styles.badge,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }
            ]}
            collapsable={false}
          >
            <Image source={require('../assets/image.png')} style={styles.logo} />
            <Text style={[styles.badgeTitle, { color: theme.colors.primary }]}>NEIGHNET</Text>

            {/* Shimmer mientras generamos/convertimos */}
            {loadingQR ? (
              <ShimmerPlaceHolder
                LinearGradient={LinearGradient}
                style={{ width: 240, height: 240, borderRadius: 12 }}
              />
            ) : (
              <QRCode
                value={qrValue}
                size={240}
                ecl="M"
                backgroundColor="#fff"
                color="#000"
                getRef={(c) => (qrRef.current = c)}
              />
            )}

            <Text style={[styles.badgeMessage, { color: theme.colors.text }]}>{mensajeQR}</Text>
          </View>

          <CustomButton title="Compartir pase" onPress={handleCompartirBadge} />
        </Card>
      )}

      {/* Badge invisible para compartir */}
      {qrBase64 && (
        <View
          ref={invisibleBadgeRef}
          style={[
            styles.badge,
            {
              position: 'absolute',
              top: -1000,
              left: -1000,
              opacity: 0,
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.primary,
            }
          ]}
          collapsable={false}
        >
          <Image source={require('../assets/image.png')} style={styles.logo} />
          <Text style={[styles.badgeTitle, { color: theme.colors.primary }]}>NEIGHNET</Text>
          <Image source={{ uri: `data:image/png;base64,${qrBase64}` }} style={{ width: 180, height: 180 }} />
          <Text style={[styles.badgeMessage, { color: theme.colors.text }]}>{mensajeQR}</Text>
        </View>
      )}

      <CustomButton title="Volver" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  banner: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },

  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  card: { marginBottom: 16 },
  infoBox: {},
  infoText: { fontSize: 16, marginBottom: 4 },
  highlight: { fontWeight: 'bold' },

  badge: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    width: 260,
    alignSelf: 'center',
  },
  logo: { width: 60, height: 60, resizeMode: 'contain' },
  badgeTitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 8 },
  badgeMessage: { marginTop: 12, fontSize: 14, textAlign: 'center' },
});
