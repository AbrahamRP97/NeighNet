import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  View,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export default function CustomButton({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
}: Props) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: theme.colors.placeholder }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled
            ? theme.colors.placeholder
            : theme.colors.primary,
          opacity: pressed ? 0.7 : 1,
          // Efecto de escala en iOS (más notorio)
          transform: pressed
            ? [{ scale: Platform.OS === 'ios' ? 0.96 : 1 }]
            : [{ scale: 1 }],
          shadowColor: theme.colors.primary,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: theme.colors.textContrast,
            fontSize: theme.fontSize.body,
            opacity: disabled ? 0.6 : 1,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
    // Sombra suave para ambas plataformas
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  text: {
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
