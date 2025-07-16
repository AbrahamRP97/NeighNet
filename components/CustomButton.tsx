import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function CustomButton({
  title,
  onPress,
  style,
  textStyle,
}: Props) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.colors.placeholder }}
      style={({ pressed }) => [
        {
          backgroundColor: theme.colors.primary,
          opacity: pressed ? 0.8 : 1,
          transform: pressed
            ? [{ scale: Platform.OS === 'ios' ? 0.97 : 1 }]
            : [{ scale: 1 }],
        },
        styles.button,
        style,
      ]}
    >
      <Text style={[{ color: '#fff', fontSize: theme.fontSize.body }, styles.text, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  text: {
    fontWeight: 'bold',
  },
});