import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../../shared/lib/supabaseClient';
import type { AdminUser } from '../../shared/types/auth.types';

interface AdminAuthContextType {
  user: AdminUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminProfile = async (supabaseUser: User): Promise<AdminUser | null> => {
    try {
      // Fetch admin profile from backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/profile`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin profile');
      }

      const data = await response.json();
      
      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        role: 'admin' as const,
        fullName: data.fullName || '',
        permissions: data.permissions || [],
        createdAt: supabaseUser.created_at,
      };
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        const adminUser = await fetchAdminProfile(session.user);
        setUser(adminUser);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        const adminUser = await fetchAdminProfile(session.user);
        setUser(adminUser);
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

    if (error) {
      return { error };
    }

    // Verify user has admin role
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      const adminUser = await fetchAdminProfile(sessionData.session.user);
      if (!adminUser) {
        await supabase.auth.signOut();
        return { 
          error: { 
            message: 'Access denied. Admin privileges required.',
            name: 'AuthorizationError',
            status: 403,
          } as AuthError 
        };
      }
    }

    return { error: null };
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
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
