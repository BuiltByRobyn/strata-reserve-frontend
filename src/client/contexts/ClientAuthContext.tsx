import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../../shared/lib/supabaseClient';
import type { ClientUser, ClientAuthContextType } from '../../shared/types/auth.types';
import { API_BASE } from '../../shared/lib/api';

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const ClientAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClientProfile = async (supabaseUser: User): Promise<ClientUser | null> => {
    try {
      // Fetch client profile from backend
      const response = await fetch(`${API_BASE}/client/profile`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch client profile');
      }

      const data = await response.json();
      
      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        role: 'client' as const,
        companyName: data.companyName || '',
        strataPlan: data.strataPlan || null,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        createdAt: supabaseUser.created_at,
      };
    } catch (error) {
      console.error('Error fetching client profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        const clientUser = await fetchClientProfile(session.user);
        setUser(clientUser);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        const clientUser = await fetchClientProfile(session.user);
        setUser(clientUser);
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

    // Verify user has client role
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      const clientUser = await fetchClientProfile(sessionData.session.user);
      if (!clientUser) {
        await supabase.auth.signOut();
        return { 
          error: { 
            message: 'Access denied. Please use the client login portal.',
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

  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>;
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};
