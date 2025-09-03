import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, Alert, View, TextInput, ActivityIndicator, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../components/Card';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { ADMIN_BASE_URL, VISITANTES_BASE_URL } from '../api';
import ScreenBanner from '../components/ScreenBanner';
import { select, tap, warning, success } from '../utils/haptics';

type Resident = {
  id: string;
  nombre: string;
  numero_casa?: string | null;
  correo?: string | null;
};

export default function AdminCreateVisitanteScreen() {
  const navigation = useNavigation<any>();
  const { theme: t } = useTheme();
  const styles = makeStyles(t);

  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // selector de residente
  const [search, setSearch] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  // formulario de visitante
  const [nombre, setNombre] = useState('');
  const [identidad, setIdentidad] = useState('');
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [color, setColor] = useState('');

  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const [r, tk] = await Promise.all([
        AsyncStorage.getItem('userRole'),
        AsyncStorage.getItem('token'),
      ]);
      setRole(r);
      setToken(tk);
      if (r !== 'admin') {
        warning();
        Alert.alert('Acceso restringido', 'Esta pantalla es solo para administradores.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
    })();
  }, []);

  const fetchResidents = async (q: string) => {
    if (!token) return;
    setLoadingResidents(true);
    try {
      const base = ADMIN_BASE_URL || 'https://neighnet-backend.onrender.com/api/admin';
      // ✅ endpoint correcto y respuesta { items: [...] }
      const url = `${base}/residentes${q ? `?q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        Alert.alert('Error', data?.error || 'No se pudieron listar residentes');
        setResidents([]);
      } else {
        setResidents(Array.isArray(data?.items) ? data.items : []);
      }
    } catch {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
      setResidents([]);
    } finally {
      setLoadingResidents(false);
    }
  };

  useEffect(() => {
    if (role === 'admin' && token) {
    fetchResidents('');
    }
  }, [role, token]);

  // debounce de búsqueda
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResidents(search.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleSelectResident = (r: Resident) => {
    select();
    setSelectedResident(r);
  };

  const canSave = useMemo(() => {
    return (
      role === 'admin' &&
      !!selectedResident?.id &&
      !!nombre &&
      !!identidad &&
      !!placa &&
      !!marca &&
      !!modelo &&
      !!color
    );
  }, [role, selectedResident, nombre, identidad, placa, marca, modelo, color]);

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert('Campos incompletos', 'Completa todos los campos y elige un residente.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre,
        identidad,
        placa,
        marca_vehiculo: marca,
        modelo_vehiculo: modelo,
        color_vehiculo: color,
        // clave especial: el backend de admin la acepta
        residente_id: selectedResident!.id,
      };

      // ✅ usa el endpoint de admin (no el de residentes)
      const base = ADMIN_BASE_URL || 'https://neighnet-backend.onrender.com/api/admin';
      const res = await fetch(`${base}/visitantes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const txt = await res.text();
      const data = txt ? JSON.parse(txt) : null;

      if (!res.ok) {
        Alert.alert('Error', data?.error || 'No se pudo crear el visitante');
        return;
      }

      success();
      Alert.alert('Éxito', 'Visitante creado correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);

      // limpia el formulario (opcional)
      setNombre('');
      setIdentidad('');
      setPlaca('');
      setMarca('');
      setModelo('');
      setColor('');
    } catch {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: t.colors.background }}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenBanner title="Crear visitante (Admin)" onBack={() => navigation.goBack()} />

        {/* Selector de RESIDENTE */}
        <Card>
          <Text style={[styles.sectionTitle, { color: t.colors.primary }]}>Seleccionar residente</Text>

          <TextInput
            style={[
              styles.searchInput,
              { borderColor: t.colors.placeholder, color: t.colors.text, backgroundColor: t.colors.card },
            ]}
            placeholder="Buscar por nombre, casa o correo..."
            placeholderTextColor={t.colors.placeholder}
            value={search}
            onChangeText={setSearch}
            onFocus={tap}
          />

          {loadingResidents ? (
            <View style={{ paddingVertical: 10 }}>
              <ActivityIndicator color={t.colors.primary} />
            </View>
          ) : residents.length === 0 ? (
            <Text style={{ color: t.colors.text, opacity: 0.7, marginTop: 6 }}>
              No hay resultados.
            </Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              {residents.map((r) => {
                const isSel = selectedResident?.id === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => handleSelectResident(r)}
                    style={({ pressed }) => [
                      styles.residentRow,
                      {
                        backgroundColor: isSel ? t.colors.primary + '1A' : t.colors.card,
                        borderColor: isSel ? t.colors.primary : t.colors.placeholder,
                        opacity: pressed ? 0.95 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.residentName, { color: t.colors.text }]} numberOfLines={1}>
                        {r.nombre}
                      </Text>
                      <Text style={{ color: t.colors.text + '99', fontSize: 13 }} numberOfLines={1}>
                        Casa {r.numero_casa || '—'} · {r.correo || 'sin correo'}
                      </Text>
                    </View>
                    {isSel ? (
                      <Text style={{ color: t.colors.primary, fontWeight: '700' }}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>

        {/* Formulario de VISITANTE */}
        <Card style={{ marginTop: 16 }}>
          <Text style={[styles.sectionTitle, { color: t.colors.primary }]}>Datos del visitante</Text>
          <CustomInput placeholder="Nombre completo" value={nombre} onChangeText={setNombre} />
          <CustomInput
            placeholder="Número de identidad"
            value={identidad}
            onChangeText={setIdentidad}
            keyboardType="number-pad"
          />
          <CustomInput placeholder="Placa del vehículo" value={placa} onChangeText={setPlaca} />
          <CustomInput placeholder="Marca del vehículo" value={marca} onChangeText={setMarca} />
          <CustomInput placeholder="Modelo del vehículo" value={modelo} onChangeText={setModelo} />
          <CustomInput placeholder="Color del vehículo" value={color} onChangeText={setColor} />

          <CustomButton
            title={saving ? 'Guardando...' : 'Crear visitante'}
            onPress={handleSave}
            disabled={!canSave || saving}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flexGrow: 1, padding: 24, backgroundColor: theme.colors.background },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    searchInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    residentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
      gap: 10,
    },
    residentName: { fontWeight: '700', fontSize: 15 },
  });
