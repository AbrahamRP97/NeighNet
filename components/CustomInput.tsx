import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface CustomInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hasError?: boolean;
  editable?: boolean;
  secureTextEntry?: boolean;
}

export default function CustomInput({
  value,
  onChangeText,
  placeholder,
  hasError,
  editable = true,
  secureTextEntry = false,
  ...rest
}: CustomInputProps) {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Animación de sombra y borde
  const shadowAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(shadowAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(shadowAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = hasError
    ? theme.colors.error
    : isFocused
    ? theme.colors.primary
    : theme.colors.placeholder;

  const animatedShadow = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 8],
  });

  const animatedStyle = {
    borderColor,
    shadowOpacity: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.05, 0.18],
    }),
    shadowRadius: animatedShadow,
    elevation: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.5],
    }),
  };

  const isPassword = secureTextEntry;

  return (
    <Animated.View
      style={[
        styles.inputContainer,
        {
          backgroundColor: editable
            ? theme.colors.card
            : theme.colors.placeholder,
        },
        animatedStyle,
      ]}
    >
      <TextInput
        style={[
          styles.input,
          {
            color: theme.colors.text,
          },
          !editable && styles.disabledInput,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={isPassword && !showPassword}
        editable={editable}
        placeholderTextColor={theme.colors.placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      />
      {isPassword && (
        <TouchableOpacity
          onPress={() => setShowPassword((prev) => !prev)}
          style={styles.eyeIcon}
        >
          <Feather
            name={showPassword ? 'eye' : 'eye-off'}
            size={21}
            color={theme.colors.placeholder}
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 9,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 0,
    // sombra iOS
    shadowOffset: { width: 0, height: 2 },
    shadowColor: '#000',
    backgroundColor: '#fff', // se sobrescribe con theme
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    paddingVertical: 12,
  },
  disabledInput: {
    color: '#888',
  },
  eyeIcon: {
    paddingLeft: 10,
    paddingRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
});
