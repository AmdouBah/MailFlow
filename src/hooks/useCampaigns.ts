'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCampaigns, getCampaign, subscribeToCampaign } from '@/lib/firebase/firestore';
import type { Campaign } from '@/types';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { campaigns, loading, error, refresh: fetch };
}

export function useCampaignLive(id: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToCampaign(id, (c) => {
      setCampaign(c);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  return { campaign, loading };
}
