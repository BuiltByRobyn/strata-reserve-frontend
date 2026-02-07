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
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
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
      console.log('📥 Fetching profile from Supabase for user ID:', supabaseUser.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('❌ Error fetching profile from Supabase:', error);
        throw error;
      }

      if (!profile) {
        console.error('❌ No profile found for user ID:', supabaseUser.id);
        throw new Error('Profile not found');
      }

      console.log('📋 Profile data retrieved:', profile);

      if (profile.is_admin) {
        console.log('👑 User is ADMIN');
        const adminUser: AdminUser = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: 'admin' as const,
          fullName: profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin User',
          permissions: ['read', 'write', 'delete'],
          createdAt: supabaseUser.created_at,
        };
        return adminUser;
      } else {
        console.log('👤 User is CLIENT');
        const clientUser: ClientUser = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: 'client' as const,
          companyName: 'Sample Company',
          firstName: profile.first_name || 'User',
          lastName: profile.last_name || '',
          createdAt: supabaseUser.created_at,
        };
        return clientUser;
      }
    } catch (error) {
      console.error('💥 Exception in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Initialize auth - only sets loading to false once after initial check
    const init = async () => {
      try {
        // Small delay to let Supabase's Navigator.locks settle after page refresh
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session?.user) {
          console.log('🔍 User authenticated, fetching profile for:', session.user.email);
          const appUser = await fetchUserProfile(session.user);
          
          if (!appUser) {
            console.error('❌ Profile not found. Signing out.');
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
          } else {
            console.log('✅ Profile loaded:', appUser);
            setUser(appUser);
          }
        }
      } catch (error: unknown) {
        // AbortError from Navigator.locks is expected on page refresh - ignore it
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Auth lock aborted (page refresh) - retrying...');
          // Retry after a short delay
          await new Promise(resolve => setTimeout(resolve, 200));
          try {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session?.user) {
              const appUser = await fetchUserProfile(session.user);
              setUser(appUser);
            }
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }
        } else {
          console.error('Error initializing auth:', error);
        }
      } finally {
        // Only called once - after initial session check
        setLoading(false);
      }
    };

    init();

    // Listen for auth changes (sign in/out) - does NOT affect loading state
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 Auth state changed');
      setSession(session);
      
      if (session?.user) {
        const appUser = await fetchUserProfile(session.user);
        if (appUser) {
          setUser(appUser);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      // NO setLoading here - initial load already completed
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
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

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    updatePassword,
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
