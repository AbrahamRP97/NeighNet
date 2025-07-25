import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Image, TouchableOpacity, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL } from '../api';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { Settings as SettingsIcon, LogOut } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';

export default function ProfileScreen() {
  const { theme, themeType, toggleTheme } = useTheme();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [foto, setFoto] = useState('');
  const [fotoBase, setFotoBase] = useState('');
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  const cargarPerfil = async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'No se encontró el ID del usuario');
        return;
      }
      const res = await fetch(`${AUTH_BASE_URL}/${userId}`);
      const text = await res.text();
      const data = JSON.parse(text);
      if (!res.ok || !data.nombre) {
        Alert.alert('Error', data?.error || 'Error al obtener el perfil');
        return;
      }
      setNombre(data.nombre);
      setCorreo(data.correo);
      setTelefono(data.telefono);
      setNumeroCasa(data.numero_casa);
      setFoto(data.foto_url || '');
      setFotoBase('');
    } catch {
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cerrarSesion = async () => {
    await AsyncStorage.clear();
    navigation.getParent()?.replace('Login');
  };

  if (loading) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ShimmerPlaceHolder
          LinearGradient={LinearGradient}
          style={styles.skeletonAvatar}
        />
        <ShimmerPlaceHolder
          LinearGradient={LinearGradient}
          style={styles.skeletonLine}
        />
        <ShimmerPlaceHolder
          LinearGradient={LinearGradient}
          style={styles.skeletonLine}
        />
        <ShimmerPlaceHolder
          LinearGradient={LinearGradient}
          style={styles.skeletonLine}
        />
        <ShimmerPlaceHolder
          LinearGradient={LinearGradient}
          style={styles.skeletonLine}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={styles.toggleContainer}>
        <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
          Tema oscuro
        </Text>
        <Switch
          value={themeType === 'dark'}
          onValueChange={toggleTheme}
          trackColor={{
            false: theme.colors.placeholder,
            true: theme.colors.primary,
          }}
          thumbColor={theme.colors.card}
        />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={cerrarSesion}>
         <LogOut color="red" size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('OptionsScreen')}>
          <SettingsIcon color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: theme.colors.primary }]}>
        👤 Perfil
      </Text>

      <Image
        source={
          foto
            ? { uri: foto }
            : require('../assets/default-profile.png')
        }
        style={styles.avatar}
      />

      <TextInput
        style={[styles.input, styles.disabledInput]}
        editable={false}
        value={nombre}
        placeholder="Nombre"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input, styles.disabledInput]}
        editable={false}
        value={correo}
        placeholder="Correo"
        keyboardType="email-address"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input, styles.disabledInput]}
        editable={false}
        value={telefono}
        placeholder="Teléfono"
        keyboardType="phone-pad"
        placeholderTextColor={theme.colors.placeholder}
      />
      <TextInput
        style={[styles.input, styles.disabledInput]}
        editable={false}
        value={numeroCasa}
        placeholder="Número de casa"
        placeholderTextColor={theme.colors.placeholder}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    marginRight: 8,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    color: '#000',
  },
  disabledInput: {
    backgroundColor: '#eee',
    color: '#777',
  },
  skeletonAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 16,
  },
  skeletonLine: {
    height: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
});
