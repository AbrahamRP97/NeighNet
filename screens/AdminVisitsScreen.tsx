import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable, Image, Modal, Alert, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ADMIN_BASE_URL } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

type Item = {
  id: string;
  id_qr: string;
  visitante_id: string;
  guard_id?: string | null;
  tipo: 'Entrada' | 'Salida';
  fecha_hora: string;
  expires_at?: string | null;
  cedula_url?: string | null;
  placa_url?: string | null;
  evidence_status: 'complete' | 'missing_cedula' | 'missing_placa' | 'pending' | 'n/a';
  visitante?: { id: string; nombre: string } | null;
  residente?: { id: string; nombre: string; numero_casa?: string | null } | null;
  guard?: { id: string; nombre: string } | null;
};

type Estado = 'all' | 'pending' | 'complete';
type Range = 'today' | '7d' | '30d';

export default function AdminVisitsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState<Estado>('all');
  const [range, setRange] = useState<Range>('7d');
  const [modalImg, setModalImg] = useState<string | null>(null);

  const dates = useMemo(() => {
    const now = new Date();
    let from: Date;
    if (range === 'today') {
      const f = new Date(now);
      f.setHours(0,0,0,0);
      from = f;
    } else if (range === '30d') {
      from = new Date(now.getTime() - 30*24*60*60*1000);
    } else {
      from = new Date(now.getTime() - 7*24*60*60*1000);
    }
    return { from: from.toISOString(), to: now.toISOString() };
  }, [range]);

  const badge = (s: Item['evidence_status']) => {
    if (s === 'complete') return { label: 'Completo', bg: '#DCFCE7', fg: '#166534' };
    if (s === 'missing_cedula') return { label: 'Falta cédula', bg: '#FEF3C7', fg: '#92400E' };
    if (s === 'missing_placa') return { label: 'Falta placa', bg: '#FEF3C7', fg: '#92400E' };
    if (s === 'pending') return { label: 'Pendiente', bg: '#FEE2E2', fg: '#991B1B' };
    return { label: '—', bg: '#E5E7EB', fg: '#374151' };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const tk = await AsyncStorage.getItem('token');
      if (!tk) {
        Alert.alert('Sesión', 'No hay token. Inicia sesión nuevamente.');
        setLoading(false);
        return;
      }
      const url = new URL(`${ADMIN_BASE_URL}/visitas`);
      url.searchParams.set('from', dates.from);
      url.searchParams.set('to', dates.to);
      url.searchParams.set('estado', estado);
      url.searchParams.set('limit', '100');
      const res = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
      });
      const txt = await res.text();
      let data: any = null;
      try { data = txt ? JSON.parse(txt) : null; } catch {}
      if (!res.ok) {
        console.log('[AdminVisits] status:', res.status, 'body:', txt);
        Alert.alert('Error', data?.error || 'No se pudieron cargar las visitas');
        setLoading(false);
        return;
      }
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      Alert.alert('Error', 'Fallo de conexión');
    } finally {
      setLoading(false);
    }
  }, [dates.from, dates.to, estado]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const renderItem = ({ item }: { item: Item }) => {
    const b = badge(item.evidence_status);
    return (
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginRight: 8 }}>
            {item.tipo}
          </Text>
          <View style={{ backgroundColor: b.bg, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10 }}>
            <Text style={{ color: b.fg, fontWeight: '700', fontSize: 12 }}>{b.label}</Text>
          </View>
          <View style={{ marginLeft: 'auto' }}>
            <Text style={{ color: theme.colors.text + '99', fontSize: 12 }}>
              {new Date(item.fecha_hora).toLocaleString()}
            </Text>
          </View>
        </View>

        <Text style={{ color: theme.colors.text, marginBottom: 2 }}>
          👥 <Text style={{ fontWeight: '700' }}>{item.visitante?.nombre || 'Visitante'}</Text>
        </Text>
        <Text style={{ color: theme.colors.text, marginBottom: 2 }}>
          🏡 {item.residente?.nombre || 'Residente'} · Casa {item.residente?.numero_casa ?? '—'}
        </Text>
        <Text style={{ color: theme.colors.text, marginBottom: 8 }}>
          🛡️ Guardia: {item.guard?.nombre || '—'}
        </Text>

        {item.tipo === 'Entrada' && (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Pressable
              onPress={() => item.cedula_url && setModalImg(item.cedula_url)}
              style={[
                styles.thumb,
                { borderColor: theme.colors.placeholder, backgroundColor: theme.colors.card },
              ]}
            >
              {item.cedula_url ? (
                <Image source={{ uri: item.cedula_url }} style={styles.thumbImg} />
              ) : (
                <Text style={{ color: theme.colors.text + '66', fontSize: 12, textAlign: 'center' }}>Sin cédula</Text>
              )}
              <Text style={{ fontSize: 11, color: theme.colors.text + '99', marginTop: 4 }}>DNI</Text>
            </Pressable>

            <Pressable
              onPress={() => item.placa_url && setModalImg(item.placa_url)}
              style={[
                styles.thumb,
                { borderColor: theme.colors.placeholder, backgroundColor: theme.colors.card },
              ]}
            >
              {item.placa_url ? (
                <Image source={{ uri: item.placa_url }} style={styles.thumbImg} />
              ) : (
                <Text style={{ color: theme.colors.text + '66', fontSize: 12, textAlign: 'center' }}>Sin placa</Text>
              )}
              <Text style={{ fontSize: 11, color: theme.colors.text + '99', marginTop: 4 }}>Placa</Text>
            </Pressable>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerSpacer} />

      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.banner, { paddingTop: Platform.select({ ios: 28, android: 18 }) }]}
      >

        <View style={styles.bannerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={20}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>

          <Text style={styles.bannerTitle} numberOfLines={1}>Panel Admin · Visitas</Text>

          <View style={styles.backBtn} />
        </View>
      </LinearGradient>

      <Card style={{ marginBottom: 12 }}>
        {/* fila 1: rango */}
        <View style={styles.filtersRow}>
          {(['today', '7d', '30d'] as Range[]).map(r => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={[
                styles.chip,
                { borderColor: theme.colors.primary, backgroundColor: range === r ? theme.colors.primary : 'transparent' },
              ]}
            >
              <Text style={{ color: range === r ? theme.colors.textContrast : theme.colors.primary, fontWeight: '700' }}>
                {r === 'today' ? 'Hoy' : r}
              </Text>
            </Pressable>
          ))}
        </View>
        {/* fila 2: estado + acciones */}
        <View style={styles.filtersRow}>
          {(['all', 'pending', 'complete'] as Estado[]).map(s => (
            <Pressable
              key={s}
              onPress={() => setEstado(s)}
              style={[
                styles.chip,
                { borderColor: theme.colors.primary, backgroundColor: estado === s ? theme.colors.primary : 'transparent' },
              ]}
            >
              <Text style={{ color: estado === s ? theme.colors.textContrast : theme.colors.primary, fontWeight: '700' }}>
                {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendientes' : 'Completos'}
              </Text>
            </Pressable>
          ))}

          <View style={styles.actionsRow}>
            <CustomButton
              title="Crear visitante"
              onPress={() => navigation.navigate('AdminCreateVisitante')}
            />
            <CustomButton title="Actualizar" onPress={fetchData} />
          </View>
        </View>
      </Card>

      {loading ? (
        <View style={{ paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      <Modal visible={!!modalImg} transparent animationType="fade" onRequestClose={() => setModalImg(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalImg(null)}>
          {modalImg && <Image source={{ uri: modalImg }} style={styles.modalImg} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  headerSpacer: { height: 24},

  banner: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bannerTitle: { color: '#fff', fontWeight: '800', fontSize: 18, textAlign: 'center' },

  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 8,
    marginBottom: 8,
  },
  actionsRow: {
    marginLeft: 'auto',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
    flexShrink: 1,
  },

  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  thumb: { width: 92, height: 92, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  thumbImg: { width: '100%', height: '100%', borderRadius: 8 },
  modalBackdrop: { flex: 1, backgroundColor: '#000C', alignItems: 'center', justifyContent: 'center' },
  modalImg: { width: '92%', height: '76%' },
});
