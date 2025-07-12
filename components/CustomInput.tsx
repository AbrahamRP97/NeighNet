import React, { forwardRef } from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  hasError?: boolean;
}

const CustomInput = forwardRef<TextInput, Props>(({ hasError = false, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      style={[
        styles.input,
        hasError ? styles.inputError : {},
      ]}
      placeholderTextColor="#999"
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputError: {
    borderColor: 'red',
  },
});

export default CustomInput;