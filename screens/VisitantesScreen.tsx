import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { VISITANTES_BASE_URL } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../components/CustomButton';
import { useNavigation } from '@react-navigation/native';
 // import { Pencil, Trash2 } from 'lucide-react-native'; // iconos opcionales

export default function VisitantesScreen() {
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => { fetchVisitantes(); }, []);

  const fetchVisitantes = async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'No se pudo obtener tu ID');
        setVisitantes([]);
        return;
      }

      const response = await fetch(`${VISITANTES_BASE_URL}/${userId}`);
      const text = await response.text();
      const data = JSON.parse(text);

      if (!response.ok) {
        Alert.alert('Error', data?.error || 'No se pudieron cargar los visitantes');
        setVisitantes([]);
      } else if (!Array.isArray(data)) {
        Alert.alert('Advertencia', 'La respuesta no es válida');
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

  const handleSeleccionar = (visitante: any) => {
    if (!visitante) {
      Alert.alert('Error', 'Visitante no válido');
      return;
    }
    navigation.navigate('QRGenerator', { visitante });
  };

  const handleEditar = (visitante: any) => {
    if (!visitante) {
      Alert.alert('Error', 'Visitante no válido');
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
                fetchVisitantes();
              } else {
                const data = await response.json();
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100}
    >
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
                <TouchableOpacity onPress={() => handleSeleccionar(item)} style={{ flex: 1 }}>
                  <Text style={styles.itemText}>
                    {item.nombre} - {item.identidad}
                  </Text>
                </TouchableOpacity>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleEditar(item)} style={styles.iconButton}>
                    {/* <Pencil size={20} color="#1e90ff" /> */}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleEliminar(item.id)} style={styles.iconButton}>
                    {/* <Trash2 size={20} color="red" /> */}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', marginTop: 16 }}>
                No hay visitantes registrados aún
              </Text>
            }
          />
        )}

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
  container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
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
  itemText: { fontSize: 16 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginLeft: 8 },
});
