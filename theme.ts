export interface Theme {
  colors: {
    primary: string;
    accent: string;
    background: string;
    card: string;
    text: string;
    placeholder: string;
    error: string;
    textContrast: string;
  };
  spacing: {
    s: number;
    m: number;
    l: number;
  };
  fontSize: {
    small: number;
    body: number;
    title: number;
  };
  borderRadius: {
    s: number;
    m: number;
    l: number;
  };
}

export const lightTheme: Theme = {
  colors: {
    primary: '#1E88E5',
    accent: '#00C2FF',
    background: '#f5faff',
    card: '#ffffff',
    text: '#333333',
    placeholder: '#cccccc',
    error: '#e74c3c',
    textContrast: '#ffffff',
  },
  spacing: { s: 8, m: 12, l: 16 },
  fontSize: { small: 12, body: 16, title: 22 },
  borderRadius: { s: 4, m: 8, l: 12 },
};

export const darkTheme: Theme = {
  colors: {
    primary: '#3B82F6',
    accent: '#60A5FA',
    background: '#121212',
    card: '#1f1f1f',
    text: '#ffffff',
    placeholder: '#444444',
    error: '#cf6679',
    textContrast: '#000000',
  },
  spacing: { s: 8, m: 16, l: 24 },
  fontSize: { small: 12, body: 14, title: 20 },
  borderRadius: { s: 8, m: 12, l: 16 },
};
