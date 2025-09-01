import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { VISITANTES_BASE_URL } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../components/CustomButton';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Pencil, Trash2, QrCode } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../components/Card';

export default function VisitantesScreen() {
  const { theme } = useTheme();
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();
  const styles = makeStyles(theme);

  const fetchVisitantes = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Sesión', 'No se encontró el token de sesión. Inicia sesión nuevamente.');
        setVisitantes([]);
        return;
      }

      const res = await fetch(`${VISITANTES_BASE_URL}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : [];

      if (!res.ok || !Array.isArray(data)) {
        Alert.alert('Error', (data && data.error) || 'No se pudieron cargar los visitantes');
        setVisitantes([]);
      } else {
        setVisitantes(data);
      }
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor');
      setVisitantes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVisitantes();
    }, [fetchVisitantes])
  );

  const handleSeleccionar = (visitante: any) => {
    if (!visitante) return Alert.alert('Error', 'Visitante no válido');
    navigation.navigate('QRGenerator', { visitante });
  };

  const handleEditar = (visitante: any) => {
    if (!visitante) return Alert.alert('Error', 'Visitante no válido');
    navigation.navigate('CrearVisitante', { visitante });
  };

  const handleEliminar = (visitanteId: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este visitante?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                Alert.alert('Sesión', 'No se encontró el token de sesión.');
                return;
              }
              const res = await fetch(`${VISITANTES_BASE_URL}/${visitanteId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                Alert.alert('Eliminado', 'El visitante fue eliminado');
                fetchVisitantes();
              } else {
                const data = await res.json().catch(() => ({}));
                Alert.alert('Error', data?.error || 'No se pudo eliminar');
              }
            } catch {
              Alert.alert('Error', 'Error de conexión al eliminar visitante');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <Text style={styles.bannerTitle}>Visitantes</Text>
          <Text style={styles.bannerSubtitle}>Selecciona, edita o elimina visitantes</Text>
        </LinearGradient>

        {[...Array(5)].map((_, i) => (
          <ShimmerPlaceHolder
            key={i}
            LinearGradient={LinearGradient}
            style={styles.skeletonItem}
          />
        ))}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Banner */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <Text style={styles.bannerTitle}>Visitantes</Text>
          <Text style={styles.bannerSubtitle}>Selecciona, edita o elimina visitantes</Text>
        </LinearGradient>

        <FlatList
          data={visitantes}
          keyExtractor={(item) => item?.id?.toString?.() ?? String(item.id)}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <Card onPress={() => handleSeleccionar(item)}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                    {item.nombre}
                  </Text>
                  <Text style={[styles.itemSub, { color: theme.colors.placeholder }]}>
                    Identidad: {item.identidad}
                  </Text>
                  {item.placa ? (
                    <Text style={[styles.itemSub, { color: theme.colors.placeholder }]}>
                      Placa: {item.placa}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.actions}>
                  <Pressable style={styles.iconButton} onPress={() => handleSeleccionar(item)} hitSlop={8}>
                    <QrCode size={20} color={theme.colors.primary} />
                  </Pressable>
                  <Pressable style={styles.iconButton} onPress={() => handleEditar(item)} hitSlop={8}>
                    <Pencil size={20} color={theme.colors.primary} />
                  </Pressable>
                  <Pressable style={styles.iconButton} onPress={() => handleEliminar(item.id)} hitSlop={8}>
                    <Trash2 size={20} color="red" />
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <Card>
              <Text style={{ textAlign: 'center', marginBottom: 12, color: theme.colors.text }}>
                No hay visitantes registrados aún
              </Text>
              <CustomButton
                title="Agregar nuevo visitante"
                onPress={() => navigation.navigate('CrearVisitante')}
              />
            </Card>
          }
        />

        <CustomButton
          title="Agregar nuevo visitante"
          onPress={() => navigation.navigate('CrearVisitante')}
        />
        <CustomButton title="Volver" onPress={() => navigation.goBack()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16 },
    banner: {
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    bannerSubtitle: { color: '#fff', opacity: 0.9, marginTop: 4, fontSize: 13 },
    row: { flexDirection: 'row', alignItems: 'center' },
    itemTitle: { fontSize: 16, fontWeight: '700' },
    itemSub: { fontSize: 13, marginTop: 2 },
    actions: { flexDirection: 'row', marginLeft: 8, alignItems: 'center' },
    iconButton: { marginLeft: 8, padding: 6, borderRadius: 10 },
    skeletonItem: {
      height: 66,
      borderRadius: 12,
      marginVertical: 6,
    },
  });
