import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, initAuthHeaders } from '../api/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: number | null;
  isLoading: boolean; // Add loading state
  setIsAuthenticated: (value: boolean) => void;
  setUserId: (id: number | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userId: null,
  isLoading: true,
  setIsAuthenticated: () => {},
  setUserId: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Restore auth state on app startup
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const token = await authApi.getToken();
        if (token) {
          await initAuthHeaders();
          try {
            const meRes = await authApi.me();
            setUserId(meRes.data.id);
            setIsAuthenticated(true);
          } catch (e) {
            // token invalid, clear it
            await authApi.removeToken();
            setIsAuthenticated(false);
            setUserId(null);
          }
        }
      } catch (error) {
        console.error('Failed to restore auth:', error);
      } finally {
        setIsLoading(false); // Always set loading to false
      }
    };
    restoreAuth();
  }, []);

  const logout = useCallback(() => {
    authApi.removeToken();
    setIsAuthenticated(false);
    setUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, userId, isLoading, setIsAuthenticated, setUserId, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
