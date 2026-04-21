import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { apiService } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsAuthenticated(false);
        return false;
      }

      // Test the token by making an authenticated API call
      try {
        // Try to get servers list which requires authentication
        await apiService.getServers();
        setIsAuthenticated(true);
        return true;
      } catch {
        // If authentication fails, check if token is valid
        try {
          await apiService.verifyToken();
          // If verifyToken succeeds, token is valid but getServers failed for other reasons
          setIsAuthenticated(false);
          return false;
        } catch {
          // If verifyToken fails, check if server is reachable
          await apiService.healthCheck();
          // Server is reachable but token is invalid
          setIsAuthenticated(false);
          return false;
        }
      }
    } catch {
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (token: string): Promise<boolean> => {
    try {
      localStorage.setItem('auth_token', token);
      const success = await checkAuth();
      return success;
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}