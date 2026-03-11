'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
  refEqual
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useAuth } from '../provider';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  loading: boolean;
  error: FirestoreError | Error | null;
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Gated by authentication state and reference stability.
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  const { currentUser, authInitialized } = useAuth();

  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  // Stabilize reference
  const [stableRef, setStableRef] = useState(memoizedDocRef);
  useEffect(() => {
    if (!memoizedDocRef) {
      if (stableRef) setStableRef(null);
      return;
    }
    const isSame = stableRef && refEqual(memoizedDocRef, stableRef);
    if (!isSame) {
      setStableRef(memoizedDocRef);
    }
  }, [memoizedDocRef, stableRef]);

  useEffect(() => {
    if (!authInitialized) {
      setIsLoading(true);
      return;
    }
    
    if (!currentUser || !stableRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      stableRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        if (err.code === 'permission-denied') {
          const contextualError = new FirestorePermissionError({
            operation: 'get',
            path: stableRef.path,
          });
          errorEmitter.emit('permission-error', contextualError);
          setError(contextualError);
        } else {
          console.error('Firestore doc error:', err);
          setError(err);
        }
        setData(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authInitialized, currentUser, stableRef]);

  return { 
    data, 
    isLoading, 
    loading: isLoading,
    error 
  };
}
