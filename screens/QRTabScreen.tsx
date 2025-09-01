import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import CustomButton from '../components/CustomButton';
import { useNavigation } from '@react-navigation/native';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function QRTabScreen() {
  const navigation = useNavigation<any>();
  const { theme: t } = useTheme();
  const styles = makeStyles(t);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[t.colors.primary, t.colors.accent]} start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={styles.banner}>
        <Image source={require('../assets/image.png')} style={styles.logo} />
        <Text style={styles.bannerTitle}>Pases de visitantes</Text>
        <Text style={styles.bannerSubtitle}>Genera y comparte códigos QR de acceso</Text>
      </LinearGradient>

      <Card>
        <Text style={styles.title}>Generar código QR</Text>
        <Text style={styles.description}>Selecciona un visitante para generar su pase de acceso.</Text>
        <CustomButton title="Seleccionar visitante" onPress={() => navigation.navigate('Visitantes')} />
      </Card>
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container:{ flex:1, padding:24, backgroundColor: theme.colors.background },
  banner:{ borderRadius:20, paddingVertical:22, paddingHorizontal:18, marginBottom:16, alignItems:'center' },
  bannerTitle:{ color:'#fff', fontSize:20, fontWeight:'800', marginTop:10 },
  bannerSubtitle:{ color:'#fff', opacity:0.9, marginTop:4, fontSize:13, textAlign:'center' },
  logo:{ width:64, height:64, borderRadius:12, backgroundColor:'rgba(255,255,255,0.15)' },

  title:{ fontSize:20, fontWeight:'800', color: theme.colors.primary, textAlign:'center', marginBottom:10 },
  description:{ fontSize:16, color: theme.colors.text, textAlign:'center', marginBottom:16 },
});
