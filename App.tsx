import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import TabsNavigator from "./screens/TabsNavigator";
import RegistroScreen from "./screens/RegistroScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import * as Linking from "expo-linking";
import VisitantesScreen from "./screens/VisitantesScreen";
import CrearVisitanteScreen from "./screens/CrearVisitanteScreen";
import QRGeneratorScreen from "./screens/QRGeneratorScreen";

const linking = {
  prefixes: ["neighnet2://"], // Este debe coincidir con el scheme en app.json
  config: {
    screens: {
      ResetPassword: "reset-password",
    },
  },
  async getInitialURL() {
    try {
      const url = await Linking.getInitialURL();
      return url;
    } catch (e) {
      console.error("Error getting initial URL:", e);
      return null;
    }
  },
};

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Registro"
          component={RegistroScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={TabsNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Visitantes"
          component={VisitantesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CrearVisitante"
          component={CrearVisitanteScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="QRGenerator"
          component={QRGeneratorScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
