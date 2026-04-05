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
    return { type, errorDesc, errorCode };
  });

  useEffect(() => {
    const { type, errorDesc } = urlType;

    // If Supabase returned an error in the hash (e.g. expired OTP), redirect
    // immediately to /login with the error message rather than waiting 5s.
    if (errorDesc) {
      navigate('/login', { replace: true, state: { error: errorDesc } });
      return;
    }

    const routeBySession = (session: Session) => {
      // Route to /set-password if the metadata flag is set OR the invite link
      // type is 'invite' (fallback in case metadata wasn't preserved in the JWT).
      if (session.user.user_metadata?.must_change_password || type === 'invite') {
        navigate('/set-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle INITIAL_SESSION too: Supabase v2 fires this (not SIGNED_IN) if the
      // SDK already processed the URL tokens before this listener was registered.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        routeBySession(session);
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      }
    });

    // Fallback: if onAuthStateChange doesn't fire within 5s, check session manually
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        routeBySession(session);
      } else {
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
