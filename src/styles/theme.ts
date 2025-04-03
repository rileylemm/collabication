// Theme definitions for light and dark themes

// Common types for both themes
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

// The complete theme type
export interface Theme {
  name: string;
  colors: ThemeColors;
  fontSizes: {
    small: string;
    medium: string;
    large: string;
    xlarge: string;
    xxlarge: string;
  };
  spacing: {
    xsmall: string;
    small: string;
    medium: string;
    large: string;
    xlarge: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
    circle: string;
  };
  boxShadow: {
    small: string;
    medium: string;
    large: string;
  };
  transition: string;
}

// Light theme definition
export const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: '#4361ee',
    secondary: '#3f37c9',
    background: '#ffffff',
    surface: '#f5f7fa',
    text: '#1a1a1a',
    textSecondary: '#4e4e4e',
    border: '#e0e0e0',
    error: '#d90429',
    warning: '#ff9900',
    success: '#06d6a0',
    info: '#118ab2',
  },
  fontSizes: {
    small: '0.875rem',
    medium: '1rem',
    large: '1.25rem',
    xlarge: '1.5rem',
    xxlarge: '2rem',
  },
  spacing: {
    xsmall: '0.25rem',
    small: '0.5rem',
    medium: '1rem',
    large: '1.5rem',
    xlarge: '2rem',
  },
  borderRadius: {
    small: '0.25rem',
    medium: '0.5rem',
    large: '1rem',
    circle: '50%',
  },
  boxShadow: {
    small: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    medium: '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
    large: '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1)',
  },
  transition: 'all 0.3s ease',
};

// Dark theme definition
export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#4cc9f0',
    secondary: '#7209b7',
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: '#f5f5f5',
    textSecondary: '#b0b0b0',
    border: '#444444',
    error: '#ef476f',
    warning: '#ffd166',
    success: '#06d6a0',
    info: '#118ab2',
  },
  fontSizes: {
    small: '0.875rem',
    medium: '1rem',
    large: '1.25rem',
    xlarge: '1.5rem',
    xxlarge: '2rem',
  },
  spacing: {
    xsmall: '0.25rem',
    small: '0.5rem',
    medium: '1rem',
    large: '1.5rem',
    xlarge: '2rem',
  },
  borderRadius: {
    small: '0.25rem',
    medium: '0.5rem',
    large: '1rem',
    circle: '50%',
  },
  boxShadow: {
    small: '0 1px 3px rgba(0, 0, 0, 0.24), 0 1px 2px rgba(0, 0, 0, 0.36)',
    medium: '0 3px 6px rgba(0, 0, 0, 0.30), 0 2px 4px rgba(0, 0, 0, 0.24)',
    large: '0 10px 20px rgba(0, 0, 0, 0.30), 0 3px 6px rgba(0, 0, 0, 0.2)',
  },
  transition: 'all 0.3s ease',
}; 