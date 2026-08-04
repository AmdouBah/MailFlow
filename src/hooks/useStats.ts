'use client';

import { useState, useEffect, useCallback } from 'react';
import { getGlobalStats, getDailyOpenData } from '@/lib/firebase/firestore';
import type { GlobalStats, DailyOpenData } from '@/types';

export function useStats() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [chartData, setChartData] = useState<DailyOpenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, c] = await Promise.all([getGlobalStats(), getDailyOpenData(30)]);
      setStats(s);
      setChartData(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, chartData, loading, error, refresh: fetch };
}
