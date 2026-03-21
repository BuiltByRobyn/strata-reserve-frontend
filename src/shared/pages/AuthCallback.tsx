import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (session.user.user_metadata?.must_change_password) {
          navigate('/set-password', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      }
    });

    // Fallback: if onAuthStateChange doesn't fire within 5s, check session manually
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (session.user.user_metadata?.must_change_password) {
          navigate('/set-password', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        navigate('/login', { replace: true });
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return <LoadingSpinner />;
};
