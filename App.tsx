import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme as NavLightTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import LoginScreen from './screens/LoginScreen';
import RegistroScreen from './screens/RegistroScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import TabsNavigator from './screens/TabsNavigator';
import VisitantesScreen from './screens/VisitantesScreen';
import CrearVisitanteScreen from './screens/CrearVisitanteScreen';
import QRGeneratorScreen from './screens/QRGeneratorScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['neighnet2://'],
  config: { screens: { ResetPassword: 'reset-password' } },
  async getInitialURL() {
    try {
      const url = await Linking.getInitialURL();
      return url;
    } catch {
      return null;
    }
  },
};

function AppContent() {
  const { themeType } = useTheme();
  const navTheme = themeType === 'light' ? NavLightTheme : NavDarkTheme;

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={navTheme}
        linking={linking}
        fallback={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        }
      >
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Registro" component={RegistroScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Main" component={TabsNavigator} />
          <Stack.Screen name="ResetPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Visitantes" component={VisitantesScreen} />
          <Stack.Screen name="CrearVisitante" component={CrearVisitanteScreen} />
          <Stack.Screen name="QRGenerator" component={QRGeneratorScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}