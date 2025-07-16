import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../theme';

interface Props {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export default function Card({ style, children }: Props) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, {
      backgroundColor: theme.colors.card,
      shadowColor: theme.colors.text,
    }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    // sombra iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // sombra Android
    elevation: 3,
  },
});
