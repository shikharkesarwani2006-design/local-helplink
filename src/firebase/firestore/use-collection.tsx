'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, Query, DocumentData, CollectionReference, QuerySnapshot } from 'firebase/firestore';
import { useAuth } from '../provider';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  loading: boolean;
  isLoading: boolean;
  error: any;
}

/**
 * Gated Firestore collection hook that waits for Auth initialization.
 */
export function useCollection<T = any>(
  query: (Query<DocumentData> | CollectionReference<DocumentData>) & {__memo?: boolean} | null | undefined,
  options: { enabled?: boolean } = { enabled: true }
): UseCollectionResult<T> {
  const { currentUser, authInitialized } = useAuth();
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // CRITICAL: Don't run until auth is fully initialized
    if (!authInitialized) {
      setLoading(true);
      return;
    }
    
    // CRITICAL: Don't run if user is not logged in
    if (!currentUser) {
      setLoading(false);
      setData([]);
      setError(null);
      return;
    }

    // CRITICAL: Don't run if no query provided or not enabled
    if (!query || options.enabled === false) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as T)
        }));
        setData(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authInitialized, currentUser, query, options.enabled]);

  return { data, loading, isLoading: loading, error };
}
