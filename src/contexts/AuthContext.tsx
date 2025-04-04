import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types for Auth context
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthContextProps {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextProps>({
  isAuthenticated: false,
  user: null,
  token: null,
  login: async () => false,
  logout: () => {},
  error: null,
  clearError: () => {},
});

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Local storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize from local storage
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        // Clear invalid storage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  }, []);
  
  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // For demo/development, we'll use a mock login
      // In production, this would connect to your authentication API
      if (email && password) {
        const mockUser: AuthUser = {
          id: '1',
          name: 'Test User',
          email: email,
          avatar: 'https://ui-avatars.com/api/?name=Test+User'
        };
        
        const mockToken = 'mock-jwt-token';
        
        // Save to state
        setUser(mockUser);
        setToken(mockToken);
        setIsAuthenticated(true);
        
        // Save to local storage
        localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
        localStorage.setItem(TOKEN_KEY, mockToken);
        
        return true;
      } else {
        setError('Email and password are required');
        return false;
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError(`Login failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };
  
  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };
  
  // Clear error
  const clearError = () => {
    setError(null);
  };
  
  // Context value
  const contextValue: AuthContextProps = {
    isAuthenticated,
    user,
    token,
    login,
    logout,
    error,
    clearError
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the Auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext; 