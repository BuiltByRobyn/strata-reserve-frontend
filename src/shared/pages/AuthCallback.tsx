import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AuthCallback = () => {
  const navigate = useNavigate();

  // Capture URL hash type (e.g. 'invite', 'recovery') immediately on render,
  // before the Supabase SDK clears the hash during async token processing.
  const [urlType] = useState(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const type = params.get('type');
    const errorDesc = params.get('error_description');
    const errorCode = params.get('error_code');
    console.log('[AuthCallback] Mounted. URL:', window.location.href);
    console.log('[AuthCallback] hash:', hash);
    console.log('[AuthCallback] search:', window.location.search);
    console.log('[AuthCallback] type:', type);
    console.log('[AuthCallback] access_token present:', !!params.get('access_token'));
    console.log('[AuthCallback] error_description:', errorDesc);
    return { type, errorDesc, errorCode };
  });

  useEffect(() => {
    const { type, errorDesc } = urlType;

    // If Supabase returned an error in the hash (e.g. expired OTP), redirect
    // immediately to /login with the error message rather than waiting 5s.
    if (errorDesc) {
      console.log('[AuthCallback] Error in URL hash. → navigating to /login with error');
      navigate('/login', { replace: true, state: { error: errorDesc } });
      return;
    }

    const routeBySession = (session: Session) => {
      console.log('[AuthCallback] routeBySession called. type:', type);
      console.log('[AuthCallback] user_metadata:', session.user.user_metadata);
      console.log('[AuthCallback] must_change_password:', session.user.user_metadata?.must_change_password);
      // Route to /set-password if the metadata flag is set OR the invite link
      // type is 'invite' (fallback in case metadata wasn't preserved in the JWT).
      if (session.user.user_metadata?.must_change_password || type === 'invite') {
        console.log('[AuthCallback] → navigating to /set-password');
        navigate('/set-password', { replace: true });
      } else {
        console.log('[AuthCallback] → navigating to /dashboard');
        navigate('/dashboard', { replace: true });
      }
    };

    console.log('[AuthCallback] Setting up onAuthStateChange listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] onAuthStateChange event:', event, 'session:', !!session);
      // Handle INITIAL_SESSION too: Supabase v2 fires this (not SIGNED_IN) if the
      // SDK already processed the URL tokens before this listener was registered.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        routeBySession(session);
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log('[AuthCallback] → navigating to /reset-password');
        navigate('/reset-password', { replace: true });
      } else {
        console.log('[AuthCallback] Unhandled event or no session:', event, !!session);
      }
    });

    // Fallback: if onAuthStateChange doesn't fire within 5s, check session manually
    const timeout = setTimeout(async () => {
      console.log('[AuthCallback] Fallback timeout fired. Checking session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AuthCallback] Fallback session:', !!session);
      if (session) {
        routeBySession(session);
      } else {
        console.log('[AuthCallback] No session found. → navigating to /login');
        navigate('/login', { replace: true });
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, urlType]);

  return <LoadingSpinner />;
};
