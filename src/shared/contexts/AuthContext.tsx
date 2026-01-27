import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { AppUser, AdminUser, ClientUser } from '../types/auth.types';

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (supabaseUser: User): Promise<AppUser | null> => {
    try {
      // First, try to fetch from the backend to determine role
      // In a real app, you'd have a user_roles table or metadata in Supabase
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if user is admin based on role field
        if (data.role === 'admin') {
          const adminUser: AdminUser = {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            role: 'admin' as const,
            fullName: data.fullName || data.name || 'Admin User',
            permissions: data.permissions || ['read', 'write', 'delete'],
            createdAt: supabaseUser.created_at,
          };
          return adminUser;
        } else {
          const clientUser: ClientUser = {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            role: 'client' as const,
            companyName: data.companyName || 'Sample Company',
            firstName: data.firstName || 'User',
            lastName: data.lastName || '',
            createdAt: supabaseUser.created_at,
          };
          return clientUser;
        }
      }

      // Fallback: Check email domain or other heuristics
      // For demo purposes, if email contains 'admin', treat as admin
      const isAdmin = supabaseUser.email?.toLowerCase().includes('admin') || false;
      
      if (isAdmin) {
        const adminUser: AdminUser = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: 'admin' as const,
          fullName: 'Admin User',
          permissions: ['read', 'write', 'delete'],
          createdAt: supabaseUser.created_at,
        };
        return adminUser;
      } else {
        const clientUser: ClientUser = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: 'client' as const,
          companyName: 'Sample Company',
          firstName: supabaseUser.email?.split('@')[0] || 'User',
          lastName: '',
          createdAt: supabaseUser.created_at,
        };
        return clientUser;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      
      // Fallback to client role on error
      const clientUser: ClientUser = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        role: 'client' as const,
        companyName: 'Sample Company',
        firstName: supabaseUser.email?.split('@')[0] || 'User',
        lastName: '',
        createdAt: supabaseUser.created_at,
      };
      return clientUser;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        const appUser = await fetchUserProfile(session.user);
        setUser(appUser);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        const appUser = await fetchUserProfile(session.user);
        setUser(appUser);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    isAdmin: user?.role === 'admin',
    isClient: user?.role === 'client',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
