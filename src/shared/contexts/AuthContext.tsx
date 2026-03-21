import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { AppUser, AdminUser, ClientUser, AuthContextType } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Incremented on every signOut so in-flight fetchUserProfile calls can detect
  // they started before the sign-out and discard their stale result.
  const signOutGenerationRef = useRef(0);

  const fetchUserProfile = async (supabaseUser: User): Promise<AppUser | null> => {
    try {
      // console.log('Fetching profile from Supabase for user ID:', supabaseUser.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile from Supabase:', error);
        throw error;
      }

      if (!profile) {
        console.error('No profile found for user ID:', supabaseUser.id);
        throw new Error('Profile not found');
      }

      // console.log('Profile data retrieved:', profile);

      if (profile.is_admin) {
        console.log('User is ADMIN');
        const adminUser: AdminUser = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: 'admin' as const,
          fullName: profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin User',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          permissions: ['read', 'write', 'delete'],
          createdAt: supabaseUser.created_at,
        };
        return adminUser;
      } else {
        // console.log('User is CLIENT');

        let strataId: number | null = null;
        let strataPlan: string | null = null;
        try {
          const { data: strataProfile } = await supabase
            .from('strata_profiles')
            .select('strata_id, strata:strata_id(strata_plan)')
            .eq('profile_id', supabaseUser.id)
            .limit(1)
            .single();

          if (strataProfile) {
            strataId = strataProfile.strata_id;
            const strata = strataProfile.strata as unknown as { strata_plan: string | null };
            strataPlan = strata?.strata_plan ?? null;
          }
        } catch (err) {
          console.warn('Could not fetch strata plan for client:', err);
        }

        const clientUser: ClientUser = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: 'client' as const,
          companyName: profile.company_name || 'N/A',
          strataId,
          strataPlan,
          firstName: profile.first_name || 'User',
          lastName: profile.last_name || '',
          createdAt: supabaseUser.created_at,
        };
        return clientUser;
      }
    } catch (error) {
      console.error('Exception in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Track initialization to prevent race conditions
    let isInitialized = false;
    let isMounted = true;

    // Helper to handle session with profile fetching
    // IMPORTANT: This function should be called OUTSIDE of onAuthStateChange 
    // callback context to avoid Navigator.locks deadlock
    const handleSession = async (session: Session | null): Promise<void> => {
      if (!isMounted) return;

      setSession(session);

      if (session?.user) {
        // console.log('User authenticated, fetching profile for:', session.user.email);
        const generationAtStart = signOutGenerationRef.current;
        try {
          const appUser = await fetchUserProfile(session.user);

          // Discard stale result if signOut was called while we were fetching
          if (!isMounted || signOutGenerationRef.current !== generationAtStart) return;

          if (!appUser) {
            // Do NOT sign out here — calling signOut() destroys the session for
            // newly invited users who are mid-way through the /auth/callback →
            // /set-password flow. Just leave user as null so routing handles it.
            console.error('Profile not found for user:', session.user.id);
            setUser(null);
          } else {
            // console.log('Profile loaded:', appUser);
            setUser(appUser);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          if (isMounted && signOutGenerationRef.current === generationAtStart) {
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      
      // Set loading to false after handling session
      if (!isInitialized && isMounted) {
        isInitialized = true;
        setLoading(false);
      }
    };

    // Set up auth state change listener
    // CRITICAL: Do NOT await inside this callback - it causes Navigator.locks deadlock!
    // Use setTimeout(0) to defer execution outside the auth lock context
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // console.log('Auth state change:', event, session ? 'has session' : 'no session');
      
      // Defer to next tick to break out of Navigator.locks context
      // This prevents deadlock when making Supabase database queries
      setTimeout(() => {
        handleSession(session);
      }, 0);
    });

    // Also manually get session on mount as a fallback
    // (in case onAuthStateChange doesn't fire in time)
    supabase.auth.getSession().then(({ data: { session } }) => {
      // console.log('Initial session check:', session ? 'has session' : 'no session');
      // Only handle if not already initialized by onAuthStateChange
      if (!isInitialized && isMounted) {
        // Use setTimeout here too for consistency and to avoid potential lock issues
        setTimeout(() => {
          if (!isInitialized && isMounted) {
            handleSession(session);
          }
        }, 50);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    signOutGenerationRef.current++;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { error };
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signOut,
    resetPasswordForEmail,
    updatePassword,
    isAdmin: user?.role === 'admin',
    isClient: user?.role === 'client',
  }), [user, session, loading, signIn, signOut, updatePassword, resetPasswordForEmail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
