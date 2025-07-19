import React, { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import CustomButton from '../components/CustomButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AUTH_BASE_URL } from '../api';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext'; // Importar useTheme

export default function QRGeneratorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitante = route.params?.visitante;

  const badgeRef = useRef<View>(null);
  const invisibleBadgeRef = useRef<View>(null); // Para el badge a capturar fuera de pantalla
  const qrRef = useRef<any>(null);
  const [qrValue, setQrValue] = useState('');
  const [qrBase64, setQrBase64] = useState<string | null>(null); // QR en base64 para imagen
  const [nombre, setNombre] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [mensajeQR, setMensajeQR] = useState('');

  const { theme } = useTheme(); // Agregar aquí

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
      const savedId = await AsyncStorage.getItem('userId');
      if (!savedId) {
        Alert.alert('Error', 'No se pudo obtener tu ID');
        return;
      }
      try {
        const response = await fetch(`${AUTH_BASE_URL}/${savedId}`);
        const text = await response.text();
        const data = JSON.parse(text);
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

  // Generar el valor del QR y luego convertirlo a base64 (PNG)
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

    // Espera a que el QR se renderice y luego obtén la imagen base64
    setTimeout(() => {
      if (qrRef.current) {
        qrRef.current.toDataURL((data: string) => {
          setQrBase64(data);
        });
      }
    }, 500);
  };

  // Compartir el badge completo, renderizado invisible con el QR como imagen
  const handleCompartirBadge = async () => {
    if (!qrBase64) {
      Alert.alert('Primero genera el pase y espera que aparezca el QR');
      return;
    }
    try {
      // Captura la vista invisible (badge completo)
      const uri = await captureRef(invisibleBadgeRef, {
        format: 'png',
        quality: 1,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir pase de visitante',
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el pase');
    }
  };

  return (
    <ScrollView contentContainerStyle={[
      styles.container,
      { backgroundColor: theme.colors.background }
    ]}>
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        🎫 Pase de visitante
      </Text>

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

      {/* Badge visible, con el QR SVG */}
      {qrValue !== '' && (
        <Card style={styles.card}>
          <View ref={badgeRef} style={[
            styles.badge,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.primary,
            }
          ]} collapsable={false}>
            <Image source={require('../assets/image.png')} style={styles.logo} />
            <Text style={[styles.badgeTitle, { color: theme.colors.primary }]}>NEIGHNET</Text>
            {/* QR en SVG para mostrar en pantalla */}
            <QRCode value={qrValue} size={180} getRef={(c) => (qrRef.current = c)} />
            <Text style={[styles.badgeMessage, { color: theme.colors.text }]}>{mensajeQR}</Text>
          </View>
          <CustomButton title="Compartir pase" onPress={handleCompartirBadge} />
        </Card>
      )}

      {/* Badge invisible, renderizado fuera de pantalla, con el QR como imagen */}
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
          {/* QR como imagen PNG en base64 */}
          <Image
            source={{ uri: `data:image/png;base64,${qrBase64}` }}
            style={{ width: 180, height: 180 }}
          />
          <Text style={[styles.badgeMessage, { color: theme.colors.text }]}>{mensajeQR}</Text>
        </View>
      )}

      <CustomButton title="Volver" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    // backgroundColor eliminado, se pone dinámico arriba
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    // color eliminado, se pone dinámico arriba
    textAlign: 'center',
    marginVertical: 20,
  },
  card: {
    marginBottom: 16,
  },
  infoBox: {},
  infoText: {
    fontSize: 16,
    marginBottom: 4,
    // color eliminado, se pone dinámico arriba
  },
  highlight: {
    fontWeight: 'bold',
    // color eliminado, se pone dinámico arriba
  },
  badge: {
    padding: 20,
    borderRadius: 12,
    // backgroundColor eliminado, se pone dinámico
    borderWidth: 2,
    // borderColor eliminado, se pone dinámico
    alignItems: 'center',
    width: 260,
    alignSelf: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  badgeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    // color eliminado, se pone dinámico arriba
    marginVertical: 8,
  },
  badgeMessage: {
    marginTop: 12,
    fontSize: 14,
    // color eliminado, se pone dinámico arriba
    textAlign: 'center',
  },
});
