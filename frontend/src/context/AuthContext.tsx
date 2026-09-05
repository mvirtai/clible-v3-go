import { createContext, use, useState, useEffect, type ReactNode } from 'react';
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
 * Authentication context value defining session state, guest status, and auth mutations.
 */
export interface AuthContextType {
  /** Currently authenticated user or null if in guest mode / unauthenticated. */
  user: User | null;
  /** True when browsing as an anonymous guest explorer. */
  isGuest: boolean;
  /** True while the initial session check is in flight. */
  loading: boolean;
  /** Authenticates user with email and password credentials. */
  login: (email: string, password: string) => Promise<void>;
  /** Registers a new user account with email and password credentials. */
  register: (email: string, password: string) => Promise<void>;
  /** Verifies user email via token or code and establishes authenticated session. */
  verifyEmail: (params: { email?: string; code?: string; token?: string }) => Promise<User>;
  /** Terminates the active user session and reverts to guest mode. */
  logout: () => Promise<void>;
  /** Activates guest exploration mode without requiring authentication. */
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provides user authentication state and session handlers across the React component tree.
 * Built with React 19.2 idioms and optimized for React Compiler.
 *
 * @param props - React provider properties including child nodes.
 * @returns Context provider element wrapping child components.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
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
    await apiService.register(email, password);
  };

  const verifyEmail = async (params: { email?: string; code?: string; token?: string }): Promise<User> => {
    const verifiedUser = await apiService.verifyEmail(params);
    setUser(verifiedUser);
    return verifiedUser;
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } finally {
      setUser(null);
    }
  };

  const enterGuestMode = () => {
    setUser(null);
    setLoading(false);
  };

  const isGuest = user === null;

  return (
    <AuthContext value={{ user, isGuest, loading, login, register, verifyEmail, logout, enterGuestMode }}>
      {children}
    </AuthContext>
  );
};

/**
 * Custom hook to access authentication context state and session methods using React 19 use().
 *
 * @throws {Error} If invoked outside of an `<AuthProvider>`.
 * @returns The active authentication context.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = use(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

