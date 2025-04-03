import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Theme types
type ThemeType = 'light' | 'dark';

// Context types
interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

// Custom hook for using the theme context
export const useTheme = () => useContext(ThemeContext);

// Props for the ThemeProvider component
interface ThemeProviderProps {
  children: ReactNode;
}

// ThemeProvider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Try to get saved theme from localStorage, default to system preference or 'light'
  const getInitialTheme = (): ThemeType => {
    const savedTheme = localStorage.getItem('theme') as ThemeType;
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  };

  const [theme, setTheme] = useState<ThemeType>(getInitialTheme);

  // Toggle between light and dark themes
  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  // Update theme when system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 