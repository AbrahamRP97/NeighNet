import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './HomeScreen';
import ProfileScreen from './ProfileScreen';
import QRTabScreen from './QRTabScreen';
import QRScannerScreen from './QRScannerScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

const Tab = createBottomTabNavigator();

export default function TabsNavigator({ route }: any) {
  const { userName } = route.params;
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const role = await AsyncStorage.getItem('userRole');
        setUserRole(role);
      } catch (error) {
        console.error("Error al obtener userRole:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, []);

  if (!userRole) {
    return null;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2c3e50" />
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2c3e50',
        tabBarInactiveTintColor: '#bdc3c7',
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: {
          paddingBottom: 4,
          paddingTop: 6,
          height: 60,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Inicio':
              iconName = 'home';
              break;
            case 'QR':
              iconName = 'qr-code';
              break;
            case 'Escanear QR':
              iconName = 'scan';
              break;
            case 'Perfil':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio">
        {() => <HomeScreen userName={userName} />}
      </Tab.Screen>

      {userRole === 'residente' && (
        <Tab.Screen name="QR" component={QRTabScreen} />
      )}

      {userRole === 'vigilancia' && (
        <Tab.Screen name="Escanear QR" component={QRScannerScreen} />
      )}

      <Tab.Screen name="Perfil">
        {() => <ProfileScreen userName={userName} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
