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
import EvidenceCaptureScreen from './screens/EvidenceCaptureScreen';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ProfileProvider } from './context/ProfileContext';
import LoginScreen from './screens/LoginScreen';
import RegistroScreen from './screens/RegistroScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import TabsNavigator from './screens/TabsNavigator';
import VisitantesScreen from './screens/VisitantesScreen';
import CrearVisitanteScreen from './screens/CrearVisitanteScreen';
import QRGeneratorScreen from './screens/QRGeneratorScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import OptionsScreen from './screens/OptionsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import PhoneVerificationScreen from './screens/PhoneVerificationScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['neighnet://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
      Login: 'login',
      Registro: 'register',
      ForgotPassword: 'forgot-password',
      Main: 'main',
      Visitantes: 'visitantes',
      OptionsScreen: 'options',
      EditProfileScreen: 'edit-profile',
      ChangePasswordScreen: 'change-password',
      CrearVisitante: 'crear-visitante',
      QRGenerator: 'qr-generator',
    },
  },
  async getInitialURL() {
    try {
      const url = await Linking.getInitialURL();
      return url;
    } catch {
      return null;
    }
  },
  subscribe(listener: (url: string) => void) {
    const sub = Linking.addEventListener('url', ({ url }) => listener(url));
    return () => sub.remove();
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
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="Visitantes" component={VisitantesScreen} />
          <Stack.Screen name="OptionsScreen" component={OptionsScreen} />
          <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
          <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
          <Stack.Screen name="CrearVisitante" component={CrearVisitanteScreen} />
          <Stack.Screen name="QRGenerator" component={QRGeneratorScreen} />
          <Stack.Screen name="EvidenceCapture" component={EvidenceCaptureScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ProfileProvider>
          <AppContent />
        </ProfileProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
