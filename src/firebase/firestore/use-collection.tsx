'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  onSnapshot, 
  Query, 
  DocumentData, 
  CollectionReference, 
  QuerySnapshot,
  queryEqual 
} from 'firebase/firestore';
import { useAuth } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

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
 * Uses functional equality check to prevent redundant resubscriptions.
 */
export function useCollection<T = any>(
  query: (Query<DocumentData> | CollectionReference<DocumentData>) | null | undefined,
  options: { enabled?: boolean } = { enabled: true }
): UseCollectionResult<T> {
  const { currentUser, authInitialized } = useAuth();
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // Stabilize the query reference to prevent rapid subscription toggling
  const [stableQuery, setStableQuery] = useState(query);
  const queryRef = useRef(query);

  useEffect(() => {
    if (!query) {
      if (stableQuery) setStableQuery(null);
      return;
    }
    
    const isSame = stableQuery && queryEqual(query, stableQuery);
    if (!isSame) {
      setStableQuery(query);
    }
  }, [query, stableQuery]);

  useEffect(() => {
    // 1. Gate by Auth initialization
    if (!authInitialized) {
      setLoading(true);
      return;
    }
    
    // 2. Gate by Login status
    if (!currentUser) {
      setLoading(false);
      setData([]);
      setError(null);
      return;
    }

    // 3. Gate by Query presence and enabled option
    if (!stableQuery || options.enabled === false) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      stableQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as T)
        }));
        setData(docs);
        setLoading(false);
      },
      async (err) => {
        // Handle Permission Denied errors with context
        if (err.code === 'permission-denied') {
          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path: (stableQuery as any).path || 'collection_query',
          });
          errorEmitter.emit('permission-error', contextualError);
          setError(contextualError);
        } else {
          console.error('Firestore collection error:', err);
          setError(err);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authInitialized, currentUser, stableQuery, options.enabled]);

  return { data, loading, isLoading: loading, error };
}
