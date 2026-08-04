'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { onAuthChange, startTokenRefresh } from '@/lib/firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | null = null;

    const unsubscribe = onAuthChange((user) => {
      setState({ user, loading: false });
      if (user) {
        // Démarrer le rafraîchissement automatique du token
        refreshInterval = startTokenRefresh(user);
      } else {
        if (refreshInterval) {
          clearInterval(refreshInterval);
          refreshInterval = null;
        }
      }
    });

    return () => {
      unsubscribe();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  return state;
}
