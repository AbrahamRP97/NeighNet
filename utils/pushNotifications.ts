import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL } from '../api';

export async function registerAndSyncPushToken(): Promise<boolean> {
  try {
    // Permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return false;

    // Obtener Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const expoToken = tokenData?.data;
    if (!expoToken) return false;

    // Mandarlo al backend
    const jwt = await AsyncStorage.getItem('token');
    if (!jwt) return false;

    await fetch(`${AUTH_BASE_URL}/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ expo_push_token: expoToken }),
    });

    return true;
  } catch (e) {
    return false;
  }
}
