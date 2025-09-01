import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  compact?: boolean;
  gradientColors?: [string, string];
};

export default function ScreenBanner({
  title,
  subtitle,
  onBack,
  right,
  style,
  contentStyle,
  compact,
  gradientColors,
}: Props) {
  const { theme } = useTheme();
  const colors: [string, string] = gradientColors ?? [
    theme.colors.primary,
    theme.colors.accent ?? theme.colors.primary,
  ];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.banner,
        {
          borderRadius: 20,
          paddingVertical: compact ? 14 : 18,
          paddingHorizontal: 16,
        },
        style,
      ]}
    >
      <View style={[styles.row, contentStyle]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.back}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={!onBack}
        >
          {onBack ? <Ionicons name="arrow-back" size={20} color="#fff" /> : <View style={{ width: 20 }} />}
        </TouchableOpacity>

        <View style={styles.center}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        <View style={{ minWidth: 28, alignItems: 'flex-end', justifyContent: 'center' }}>
          {right}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
});
