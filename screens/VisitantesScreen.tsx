import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { VISITANTES_BASE_URL } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../components/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';

export default function VisitantesScreen() {
  const { theme } = useTheme();
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  const fetchVisitantes = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'No se pudo obtener tu ID');
        setVisitantes([]);
        return;
      }
      const res = await fetch(`${VISITANTES_BASE_URL}/${userId}`);
      const text = await res.text();
      const data = JSON.parse(text);
      if (!res.ok || !Array.isArray(data)) {
        Alert.alert('Error', data?.error || 'No se pudieron cargar los visitantes');
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
  };

  useEffect(() => {
    fetchVisitantes();
  }, []);

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
              const res = await fetch(`${VISITANTES_BASE_URL}/${visitanteId}`, {
                method: 'DELETE',
              });
              if (res.ok) {
                Alert.alert('Eliminado', 'El visitante fue eliminado');
                fetchVisitantes();
              } else {
                const data = await res.json();
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
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Selecciona un visitante
        </Text>

        <FlatList
          data={visitantes}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.item, { backgroundColor: theme.colors.card }]}>
              <TouchableOpacity onPress={() => handleSeleccionar(item)} style={{ flex: 1 }}>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>
                  {item.nombre} - {item.identidad}
                </Text>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleEditar(item)} style={styles.iconButton}>
                  <Pencil size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleEliminar(item.id)} style={styles.iconButton}>
                  <Trash2 size={20} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 16, color: theme.colors.text }}>
              No hay visitantes registrados aún
            </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
  },
  item: {
    padding: 12,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: { fontSize: 16 },
  actions: { flexDirection: 'row' },
  iconButton: { marginLeft: 8 },
  skeletonItem: {
    height: 60,
    borderRadius: 8,
    marginVertical: 6,
  },
});
