import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { API_BASE } from '../lib/api';

export const BackendWarmup = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(60000) });
        if (!cancelled && res.ok) setReady(true);
      } catch {
        if (!cancelled) setTimeout(ping, 2000);
      }
    };

    ping();
    return () => { cancelled = true; };
  }, []);

  if (ready) return <>{children}</>;

  return (
    <div className="warmup-overlay">
      <div className="warmup-content">
        <div className="loading-spinner" />
        <p>Starting application...</p>
        <p className="warmup-subtitle">This may take a moment on first load</p>
      </div>
    </div>
  );
};
