import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CustomButton from '../components/CustomButton';
import { useNavigation } from '@react-navigation/native';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';

export default function QRTabScreen() {
  const navigation = useNavigation<any>();
  const { theme: t } = useTheme();
  const styles = makeStyles(t);

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>Generar código QR</Text>
        <Text style={styles.description}>
          Selecciona un visitante para generar su pase de acceso.
        </Text>
        <CustomButton
          title="Seleccionar visitante"
          onPress={() => navigation.navigate('Visitantes')}
        />
      </Card>
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container:{ flex:1, padding:24, justifyContent:'center', backgroundColor: theme.colors.background },
  title:{ fontSize:24, fontWeight:'bold', color: theme.colors.primary, textAlign:'center', marginBottom:10 },
  description:{ fontSize:16, color: theme.colors.text, textAlign:'center', marginBottom:20 },
});
