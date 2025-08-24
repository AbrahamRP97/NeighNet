import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Image, Pressable } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { VIGILANCIA_BASE_URL, UPLOADS_BASE_URL } from '../api';
import CustomButton from '../components/CustomButton';
import { Ionicons } from '@expo/vector-icons';

type RouteParams = {
  visitaId: number;
};

export default function EvidenceCaptureScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { visitaId } = route.params as RouteParams;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [taking, setTaking] = useState<'cedula' | 'placa' | null>('cedula');
  const [loading, setLoading] = useState(false);

  const [cedulaUri, setCedulaUri] = useState<string | null>(null);
  const [placaUri, setPlacaUri] = useState<string | null>(null);

  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      const tk = await AsyncStorage.getItem('token');
      setToken(tk);
    })();
  }, []);

  const takePhoto = async () => {
    try {
      if (!cameraRef.current || !taking) return;
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (!photo?.uri) {
        Alert.alert('Error', 'No se pudo tomar la foto');
        return;
      }

      if (taking === 'cedula') {
        setCedulaUri(photo.uri);
        if (placaUri) {
          setTaking(null);
        } else {
          setTaking('placa');
        }
      } else if (taking === 'placa') {
        setPlacaUri(photo.uri);
        if (cedulaUri) {
          setTaking(null);
        } else {
          setTaking('cedula');
        }
      }
    } catch {
      Alert.alert('Error', 'Fallo al usar la cámara');
    }
  };

  const uploadWithSignedUrl = async (fileUri: string, nameHint: string): Promise<string | null> => {
    try {
      if (!token) {
        Alert.alert('Sesión', 'Falta token');
        return null;
      }
      const mime = 'image/jpeg';
      const fileName = `visita-${visitaId}-${nameHint}-${Date.now()}.jpg`;

      // 1) Pedir signed URL
      const signedRes = await fetch(`${UPLOADS_BASE_URL}/signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName,
          contentType: mime,
          bucket: 'evidencias',
        }),
      });
      const signedData = await signedRes.json().catch(() => ({}));
      if (!signedRes.ok || !signedData?.signedUrl) {
        Alert.alert('Error', signedData?.error || 'No se pudo crear la URL firmada');
        return null;
      }

      // 2) Subir binario al signedUrl (PUT)
      const putRes = await FileSystem.uploadAsync(
        signedData.signedUrl,
        fileUri,
        {
          httpMethod: 'PUT',
          headers: {
            'Content-Type': mime,
            'x-upsert': 'true',
          },
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        }
      );

      if (putRes.status !== 200) {
        Alert.alert('Error', `Error al subir la imagen (status ${putRes.status})`);
        return null;
      }

      // 3) Devolver la URL pública
      return signedData.publicUrl || null;
    } catch {
      Alert.alert('Error', 'Fallo al subir la imagen');
      return null;
    }
  };

  const guardarEvidencia = async () => {
    if (!token) {
      Alert.alert('Sesión', 'Falta token');
      return;
    }
    if (!cedulaUri || !placaUri) {
      Alert.alert('Faltan fotos', 'Debes capturar cédula y placa');
      return;
    }

    setLoading(true);
    try {
      const [cedulaUrl, placaUrl] = await Promise.all([
        uploadWithSignedUrl(cedulaUri, 'cedula'),
        uploadWithSignedUrl(placaUri, 'placa'),
      ]);

      if (!cedulaUrl || !placaUrl) {
        setLoading(false);
        return;
      }

      // 4) Enviar URLs al backend
      const res = await fetch(`${VIGILANCIA_BASE_URL}/visitas/${visitaId}/evidencia`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cedula_url: cedulaUrl, placa_url: placaUrl }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        Alert.alert('Error', data?.error || 'No se pudo adjuntar la evidencia');
        setLoading(false);
        return;
      }

      Alert.alert('Evidencia guardada', 'Se adjuntó la cédula y placa correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Fallo al adjuntar evidencia');
    } finally {
      setLoading(false);
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
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {taking && (
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          autofocus="on"
        />
      )}

      {!taking && (
        <View style={{ flex: 1, padding: 16, backgroundColor: '#111' }}>
          <Text style={styles.header}>Vista previa de evidencia</Text>
          <View style={styles.previewRow}>
            <View style={styles.previewBox}>
              <Text style={styles.label}>Cédula</Text>
              {cedulaUri ? <Image source={{ uri: cedulaUri }} style={styles.previewImg} /> : <Text style={styles.missing}>Falta</Text>}
            </View>
            <View style={styles.previewBox}>
              <Text style={styles.label}>Placa</Text>
              {placaUri ? <Image source={{ uri: placaUri }} style={styles.previewImg} /> : <Text style={styles.missing}>Falta</Text>}
            </View>
          </View>
        </View>
      )}

      {/* Controles */}
      <View style={styles.controls}>
        {taking ? (
          <>
            <Pressable style={styles.captureBtn} onPress={takePhoto}>
              <Ionicons name="radio-button-on" size={64} color="#fff" />
            </Pressable>
            <Text style={styles.tip}>
              {taking === 'cedula' ? 'Fotografiar CÉDULA' : 'Fotografiar PLACA'}
            </Text>
          </>
        ) : (
          <>
            <CustomButton title="Repetir cédula" onPress={() => setTaking('cedula')} />
            <CustomButton title="Repetir placa" onPress={() => setTaking('placa')} />
            <CustomButton title={loading ? 'Guardando...' : 'Guardar evidencia'} onPress={guardarEvidencia} disabled={loading} />
            <CustomButton title="Cancelar" onPress={() => navigation.goBack()} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 10 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewBox: { flex: 1, marginHorizontal: 6, backgroundColor: '#222', padding: 8, borderRadius: 8 },
  label: { color: '#ccc', marginBottom: 6 },
  missing: { color: '#888', textAlign: 'center', paddingVertical: 40 },
  previewImg: { width: '100%', height: 160, borderRadius: 6, backgroundColor: '#000' },
  controls: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 8,
  },
  captureBtn: {
    alignSelf: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  tip: { color: '#fff', textAlign: 'center', fontSize: 16, marginTop: 4 },
});
