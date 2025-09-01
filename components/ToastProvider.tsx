import React, { createContext, useContext, useState, useCallback } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ToastCtx = createContext<{ show:(msg:string)=>void }>({ show:()=>{} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [msg, setMsg] = useState('');
  const [vis, setVis] = useState(new Animated.Value(0));

  const show = useCallback((m: string) => {
    setMsg(m);
    Animated.timing(vis, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(vis, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      }, 1700);
    });
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <Animated.View style={[
        styles.toast,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.primary + '66',
          opacity: vis,
          transform:[{ translateY: vis.interpolate({ inputRange:[0,1], outputRange:[20,0] }) }]
        }
      ]}>
        <Text style={{ color: theme.colors.text, fontWeight:'600' }}>{msg}</Text>
      </Animated.View>
    </ToastCtx.Provider>
  );
}
const styles = StyleSheet.create({
  toast:{ position:'absolute', bottom:28, left:24, right:24, padding:12, borderRadius:12, borderWidth:1 }
});
