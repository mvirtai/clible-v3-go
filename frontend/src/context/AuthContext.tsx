import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

/**
 * Represents an authenticated user profile.
 */
export interface User {
  /** Unique user identifier. */
  id: string;
  /** Primary contact and login email address. */
  email: string;
}

/**
 * Authentication context value defining session state and auth mutations.
 */
export interface AuthContextType {
  /** Currently authenticated user or null if unauthenticated. */
  user: User | null;
  /** True while the initial session check is in flight. */
  loading: boolean;
  /** Authenticates user with email and password credentials. */
  login: (email: string, password: string) => Promise<void>;
  /** Registers a new user account with email and password credentials. */
  register: (email: string, password: string) => Promise<void>;
  /** Terminates the active user session. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provides user authentication state and session handlers across the React component tree.
 *
 * @param props - React provider properties including child nodes.
 * @returns Context provider element wrapping child components.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check user session on mount
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const currentUser = await apiService.getMe();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const loggedUser = await apiService.login(email, password);
    setUser(loggedUser);
  };

  const register = async (email: string, password: string) => {
    const newUser = await apiService.register(email, password);
    setUser(newUser);
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access authentication context state and session methods.
 *
 * @throws {Error} If invoked outside of an `<AuthProvider>`.
 * @returns The active authentication context.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
