import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

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
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={[styles.inputContainer, hasError && styles.errorBorder]}>
      <TextInput
        style={[styles.input, !editable && styles.disabledInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={isPassword && !showPassword}
        editable={editable}
        placeholderTextColor="#aaa"
        {...rest}
      />
      {isPassword && (
        <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
          <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#999" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#888',
  },
  errorBorder: {
    borderColor: '#e74c3c',
  },
  eyeIcon: {
    paddingLeft: 10,
  },
});