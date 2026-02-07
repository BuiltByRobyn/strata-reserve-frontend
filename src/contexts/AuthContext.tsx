import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Track if initial session has been processed
    let initialSessionProcessed = false;

    // Set up auth state change listener FIRST
    // This ensures we catch the INITIAL_SESSION event which fires when Supabase
    // restores the session from local storage after a page refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state change:', event);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Only set loading to false after initial session is processed
      // This prevents the race condition where we check user before session is restored
      if (!initialSessionProcessed) {
        initialSessionProcessed = true;
        setLoading(false);
      }
    });

    // Also call getSession as a fallback in case onAuthStateChange doesn't fire
    // (e.g., when there's no stored session at all)
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Only process if onAuthStateChange hasn't already handled it
      if (!initialSessionProcessed) {
        console.log('📥 Initial session from getSession:', session ? 'exists' : 'none');
        setSession(session);
        setUser(session?.user ?? null);
        initialSessionProcessed = true;
        setLoading(false);
      }
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
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
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
