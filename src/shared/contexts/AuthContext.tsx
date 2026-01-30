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
      
      // Fetch user profile from Supabase profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('❌ Error fetching profile from Supabase:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        throw error;
      }

      if (!profile) {
        console.error('❌ No profile found for user ID:', supabaseUser.id);
        console.error('This user exists in auth.users but NOT in profiles table!');
        throw new Error('Profile not found');
      }

      console.log('📋 Profile data retrieved:', profile);

      // Check if user is admin based on is_admin field in profiles table
      if (profile.is_admin) {
        console.log('👑 User is ADMIN');
        const adminUser: AdminUser = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: 'admin' as const,
          fullName: profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin User',
          permissions: ['read', 'write', 'delete'], // Default admin permissions
          createdAt: supabaseUser.created_at,
        };
        return adminUser;
      } else {
        console.log('👤 User is CLIENT');
        const clientUser: ClientUser = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: 'client' as const,
          companyName: 'Sample Company', // You can extend profiles table to include this
          firstName: profile.first_name || 'User',
          lastName: profile.last_name || '',
          createdAt: supabaseUser.created_at,
        };
        return clientUser;
      }
    } catch (error) {
      console.error('💥 Exception in fetchUserProfile:', error);
      
      // Return null on error - this will prevent login
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        console.log('🔍 User authenticated, fetching profile for:', session.user.email);
        const appUser = await fetchUserProfile(session.user);
        
        if (!appUser) {
          console.error('❌ Profile not found or error fetching profile. Signing out user.');
          // If profile doesn't exist, sign out the user
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
        } else {
          console.log('✅ Profile loaded:', appUser);
          setUser(appUser);
        }
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        console.log('🔍 Auth state changed, fetching profile for:', session.user.email);
        const appUser = await fetchUserProfile(session.user);
        
        if (!appUser) {
          console.error('❌ Profile not found or error fetching profile. Signing out user.');
          // If profile doesn't exist, sign out the user
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
        } else {
          console.log('✅ Profile loaded:', appUser);
          setUser(appUser);
        }
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
