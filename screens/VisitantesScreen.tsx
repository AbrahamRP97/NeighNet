import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { VISITANTES_BASE_URL } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../components/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { Pencil, Trash2 } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';

export default function VisitantesScreen() {
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  // 🔐 Verifica conexión
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!state.isConnected) {
        Alert.alert('Sin conexión', 'No tienes conexión a internet.');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchVisitantes();
  }, []);

  const fetchVisitantes = async () => {
    setLoading(true);
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      Alert.alert('Error', 'No se pudo obtener tu ID');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${VISITANTES_BASE_URL}/${userId}`);
      const data = await response.json();

      if (response.ok) {
        setVisitantes(data);
      } else {
        Alert.alert('Error', data.error || 'No se pudieron cargar los visitantes');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Validación para producción: prevenir navegación con visitante nulo o mal formado
  const handleSeleccionar = (visitante: any) => {
    if (!visitante || !visitante.id || !visitante.nombre) {
      Alert.alert('Error', 'Visitante inválido. No se puede continuar.');
      return;
    }

    navigation.navigate('QRGenerator', { visitante });
  };

  // 🔐 Validación para producción: verificar que el visitante a editar tenga ID
  const handleEditar = (visitante: any) => {
    if (!visitante || !visitante.id) {
      Alert.alert('Error', 'Visitante inválido para edición.');
      return;
    }

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
              const response = await fetch(`${VISITANTES_BASE_URL}/${visitanteId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Eliminado', 'El visitante fue eliminado');
                fetchVisitantes(); // refrescar la lista
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'No se pudo eliminar');
              }
            } catch (error) {
              Alert.alert('Error', 'Error de conexión');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona un visitante</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#1e90ff" />
      ) : (
        <FlatList
          data={visitantes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <TouchableOpacity
                onPress={() => handleSeleccionar(item)}
                style={{ flex: 1 }}
              >
                <Text style={styles.itemText}>
                  {item.nombre} - {item.identidad}
                </Text>
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => handleEditar(item)}
                  style={styles.iconButton}
                >
                  <Pencil size={20} color="#1e90ff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleEliminar(item.id)}
                  style={styles.iconButton}
                >
                  <Trash2 size={20} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text>No hay visitantes registrados</Text>}
        />
      )}

      <CustomButton
        title="Agregar nuevo visitante"
        onPress={() => navigation.navigate('CrearVisitante')}
      />
      <CustomButton title="Volver" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
  },
  item: {
    padding: 12,
    backgroundColor: '#fff',
    marginVertical: 6,
    borderRadius: 8,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 8,
  },
});