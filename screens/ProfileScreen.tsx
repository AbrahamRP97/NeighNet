import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  Pressable,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL } from '../api';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { LogOut, Pencil, X as CloseIcon } from 'lucide-react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../theme';
import Card from '../components/Card';

export default function ProfileScreen() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [foto, setFoto] = useState('');
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  const { theme: t, themeType, toggleTheme } = useTheme();
  const styles = makeStyles(t);

  const cargarPerfil = async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('ID no encontrado');
      const res = await fetch(`${AUTH_BASE_URL}/${userId}`);
      const data = JSON.parse(await res.text());
      if (!res.ok || !data.nombre) throw new Error(data.error || 'Perfil inválido');
      setNombre(data.nombre);
      setCorreo(data.correo);
      setTelefono(data.telefono);
      setNumeroCasa(data.numero_casa);
      setFoto(data.foto_url);
    } catch (e:any) {
      Alert.alert('Error', e.message.includes('conectar') ? 'Error de red' : e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarPerfil(); }, []);

  const guardarCambios = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('ID no disponible');
      const payload = { nombre, correo, telefono, numero_casa: numeroCasa, foto_url: foto };
      const res = await fetch(`${AUTH_BASE_URL}/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = JSON.parse(await res.text());
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar');
      Alert.alert('Éxito', 'Perfil actualizado');
      setEditando(false);
    } catch (e:any) {
      Alert.alert('Error', e.message);
    }
  };

  const seleccionarImagen = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permiso denegado');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets.length) setFoto(result.assets[0].uri);
  };

  const cerrarSesion = async () => {
    await AsyncStorage.clear();
    navigation.getParent()?.replace('Login');
  };

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <SkeletonPlaceholder
          backgroundColor={t.colors.placeholder}
          highlightColor={t.colors.card}
        >
          <View style={styles.skeletonAvatar} />
          {[...Array(4)].map((_,i)=><View key={i} style={styles.skeletonLine}/>)}
        </SkeletonPlaceholder>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Tema oscuro</Text>
          <Switch
            value={themeType==='dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: t.colors.placeholder, true: t.colors.primary }}
            thumbColor={t.colors.card}
          />
        </View>

        <View style={styles.header}>
          <Pressable
            onPress={cerrarSesion}
            android_ripple={{ color: t.colors.placeholder }}
            style={({pressed})=>[styles.iconButton,{opacity:pressed?0.6:1}]}
          ><LogOut color="red" size={24}/></Pressable>

          <Pressable
            onPress={()=>{
              if(editando){ setEditando(false); cargarPerfil(); }
              else setEditando(true);
            }}
            android_ripple={{ color: t.colors.placeholder }}
            style={({pressed})=>[styles.iconButton,{opacity:pressed?0.6:1}]}
          >
            {editando
              ? <CloseIcon color={t.colors.primary} size={24}/>
              : <Pencil color={t.colors.primary} size={24}/>
            }
          </Pressable>
        </View>

        <Text style={styles.title}>👤 Perfil</Text>

        <Pressable onPress={editando?seleccionarImagen:undefined}>
          <Image
            source={ foto?{uri:foto}:require('../assets/default-profile.png') }
            style={styles.avatar}
          />
          {editando && <Text style={styles.editPhotoText}>Cambiar foto</Text>}
        </Pressable>

        <TextInput
          style={[styles.input,!editando&&styles.disabledInput]}
          editable={editando}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre"
          placeholderTextColor={t.colors.placeholder}
        />
        <TextInput
          style={[styles.input,!editando&&styles.disabledInput]}
          editable={editando}
          value={correo}
          onChangeText={setCorreo}
          placeholder="Correo"
          keyboardType="email-address"
          placeholderTextColor={t.colors.placeholder}
        />
        <TextInput
          style={[styles.input,!editando&&styles.disabledInput]}
          editable={editando}
          value={telefono}
          onChangeText={setTelefono}
          placeholder="Teléfono"
          keyboardType="phone-pad"
          placeholderTextColor={t.colors.placeholder}
        />
        <TextInput
          style={[styles.input,!editando&&styles.disabledInput]}
          editable={editando}
          value={numeroCasa}
          onChangeText={setNumeroCasa}
          placeholder="Número de casa"
          placeholderTextColor={t.colors.placeholder}
        />

        {editando && (
          <Pressable
            onPress={guardarCambios}
            android_ripple={{color:t.colors.placeholder}}
            style={({pressed})=>[
              styles.saveButton,
              {opacity:pressed?0.8:1,backgroundColor:t.colors.primary}
            ]}
          >
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          </Pressable>
        )}
      </Card>
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container:{ flexGrow:1, padding:theme.spacing.l, backgroundColor:theme.colors.background },
  toggleContainer:{ flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:theme.spacing.m },
  toggleLabel:{ fontSize:theme.fontSize.body, color:theme.colors.text },
  header:{ flexDirection:'row',justifyContent:'space-between',marginBottom:theme.spacing.m },
  iconButton:{ borderRadius:8,padding:6 },
  title:{ fontSize:theme.fontSize.title,fontWeight:'bold',marginBottom:theme.spacing.l,textAlign:'center',color:theme.colors.primary },
  avatar:{ width:100,height:100,borderRadius:50,alignSelf:'center',marginBottom:theme.spacing.m },
  editPhotoText:{ textAlign:'center',color:theme.colors.primary,marginBottom:theme.spacing.l,fontSize:theme.fontSize.body },
  input:{ backgroundColor:theme.colors.card,padding:theme.spacing.m,marginBottom:theme.spacing.m,borderRadius:theme.borderRadius.m,borderColor:'#ccc',borderWidth:1,color:theme.colors.text },
  disabledInput:{ backgroundColor:theme.colors.placeholder,color:'#777' },
  saveButton:{ padding:theme.spacing.m,borderRadius:theme.borderRadius.l,marginTop:theme.spacing.l,alignItems:'center' },
  saveButtonText:{ color:'#fff',fontWeight:'bold',fontSize:theme.fontSize.body },
  skeletonAvatar:{ width:100,height:100,borderRadius:50,alignSelf:'center',marginBottom:theme.spacing.m },
  skeletonLine:{ height:20,borderRadius:theme.borderRadius.s,marginBottom:theme.spacing.s }
});
