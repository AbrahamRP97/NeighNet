// context/ThemeContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme } from '../theme';

type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  theme: Theme;
  themeType: ThemeType;
  toggleTheme: () => void;
}

const defaultContext: ThemeContextProps = {
  theme: lightTheme,
  themeType: 'light',
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextProps>(defaultContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const sysScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme').then(stored => {
      if (stored === 'light' || stored === 'dark') {
        setThemeType(stored);
      } else if (sysScheme === 'dark' || sysScheme === 'light') {
        setThemeType(sysScheme);
      }
      setReady(true);
    });
  }, [sysScheme]);

  const toggleTheme = () => {
    const next: ThemeType = themeType === 'light' ? 'dark' : 'light';
    setThemeType(next);
    AsyncStorage.setItem('theme', next);
  };

  if (!ready) return null;

  const selectedTheme = themeType === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme: selectedTheme, themeType, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
