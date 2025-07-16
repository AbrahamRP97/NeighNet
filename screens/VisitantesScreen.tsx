import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Pencil, Trash2 } from 'lucide-react-native';
import CustomButton from '../components/CustomButton';
import { VISITANTES_BASE_URL } from '../api';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../theme';
import Card from '../components/Card';

export default function VisitantesScreen() {
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();
  const { theme: t } = useTheme();
  const styles = makeStyles(t);

  useEffect(() => { fetchVisitantes(); }, []);

  const fetchVisitantes = async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('ID no disponible');
      const res = await fetch(`${VISITANTES_BASE_URL}/${userId}`);
      const data = JSON.parse(await res.text());
      if (!res.ok || !Array.isArray(data)) throw new Error(data.error||'Respuesta inválida');
      setVisitantes(data);
    } catch (e:any) {
      Alert.alert('Error', e.message.includes('conectar')?'Error de conexión':e.message);
      setVisitantes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionar = (v:any) => {
    if (!v) return Alert.alert('Error','Visitante no válido');
    navigation.navigate('QRGenerator',{visitante:v});
  };
  const handleEditar = (v:any) => {
    if (!v) return Alert.alert('Error','Visitante no válido');
    navigation.navigate('CrearVisitante',{visitante:v});
  };
  const handleEliminar = (id:string) => {
    Alert.alert('Eliminar?','¿Seguro deseas eliminar?',[
      {text:'Cancelar',style:'cancel'},
      { text:'Eliminar', style:'destructive', onPress:async()=>{
          try{
            const res = await fetch(`${VISITANTES_BASE_URL}/${id}`,{method:'DELETE'});
            if(!res.ok) throw new Error('No se pudo eliminar');
            Alert.alert('Eliminado','Visitante eliminado');
            fetchVisitantes();
          }catch(e:any){
            Alert.alert('Error',e.message);
          }
      }}
    ]);
  };

  if(loading){
    return(
      <View style={styles.container}>
        <SkeletonPlaceholder
          backgroundColor={t.colors.placeholder}
          highlightColor={t.colors.card}
        >
          {[...Array(5)].map((_,i)=><View key={i} style={styles.skeletonItem}/>)}
        </SkeletonPlaceholder>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS==='ios'?'padding':undefined}
      style={{flex:1}}
      keyboardVerticalOffset={100}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Selecciona un visitante</Text>

        <FlatList
          data={visitantes}
          keyExtractor={item=>item.id.toString()}
          renderItem={({item})=>(
            <Card style={styles.itemCard}>
              <Pressable onPress={()=>handleSeleccionar(item)} style={{flex:1}}>
                <Text style={styles.itemText}>{item.nombre} – {item.identidad}</Text>
              </Pressable>
              <View style={styles.actions}>
                <Pressable
                  onPress={()=>handleEditar(item)}
                  android_ripple={{color:t.colors.placeholder}}
                  style={({pressed})=>[styles.iconButton,{opacity:pressed?0.6:1}]}
                ><Pencil size={20} color={t.colors.primary}/></Pressable>
                <Pressable
                  onPress={()=>handleEliminar(item.id)}
                  android_ripple={{color:t.colors.placeholder}}
                  style={({pressed})=>[styles.iconButton,{opacity:pressed?0.6:1}]}
                ><Trash2 size={20} color="red"/></Pressable>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <Text style={{textAlign:'center',marginTop:t.spacing.l,color:t.colors.text}}>
              No hay visitantes registrados aún
            </Text>
          }
        />

        <CustomButton title="Agregar nuevo visitante" onPress={()=>navigation.navigate('CrearVisitante')}/>
        <CustomButton title="Volver" onPress={()=>navigation.goBack()}/>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme:Theme)=>StyleSheet.create({
  container:{ flex:1,backgroundColor:theme.colors.background,padding:theme.spacing.m },
  title:{ fontSize:theme.fontSize.title,fontWeight:'bold',textAlign:'center',marginVertical:theme.spacing.m,color:theme.colors.text },
  itemCard:{ flexDirection:'row',alignItems:'center',padding:0,marginVertical:0 }, // Padding/margins ya en Card
  itemText:{ fontSize:theme.fontSize.body,color:theme.colors.text,flex:1,padding:12 },
  actions:{ flexDirection:'row',alignItems:'center',paddingRight:12 },
  iconButton:{ borderRadius:6,padding:6,marginLeft:theme.spacing.s },
  skeletonItem:{ height:60,borderRadius:theme.borderRadius.m,marginBottom:theme.spacing.s }
});
