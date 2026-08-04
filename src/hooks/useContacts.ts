'use client';

import { useState, useEffect, useCallback } from 'react';
import { getContacts, getLists } from '@/lib/firebase/firestore';
import type { Contact, ContactList } from '@/types';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export function useContacts(filters?: { status?: string; listId?: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchContacts = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      const cursor = reset ? undefined : (lastDoc ?? undefined);
      const result = await getContacts(50, cursor, filters);
      setContacts((prev) => reset ? result.contacts : [...prev, ...result.contacts]);
      setLastDoc(result.lastDoc);
      setHasMore(result.lastDoc !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [filters, lastDoc]);

  const fetchLists = useCallback(async () => {
    try {
      const l = await getLists();
      setLists(l);
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    fetchContacts(true);
    fetchLists();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.status, filters?.listId]);

  return {
    contacts,
    lists,
    loading,
    error,
    hasMore,
    loadMore: () => fetchContacts(false),
    refresh: () => fetchContacts(true),
  };
}
