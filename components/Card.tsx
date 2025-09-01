import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Pressable, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

export default function Card({ style, children, onPress, disabled }: Props) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animación al presionar
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 60,
      bounciness: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 60,
      bounciness: 5,
    }).start();
  };

  // Visual normal si no tiene onPress (no es "presionable")
  if (!onPress) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            shadowColor: theme.colors.text,
            borderColor: theme.colors.primary + '40', // transparencia
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // Visual animado si se puede presionar
  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ borderRadius: 16 }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            shadowColor: theme.colors.text,
            borderColor: theme.colors.primary + '70',
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.6 : 1,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    marginVertical: 8,
    // sombra iOS
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 7,
    // sombra Android
    elevation: 4,
    borderWidth: 1.2,
  },
});
