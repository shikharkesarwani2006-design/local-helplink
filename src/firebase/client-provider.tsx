
'use client';

import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Ensures Firebase is initialized once on the client and handles hydration mismatch.
 * It returns null on the server and the first client-side pass to ensure 
 * the DOM remains consistent before hydration.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Initialize Firebase SDKs once on the client.
  const firebaseServices = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return initializeFirebase();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydration Guard: Return null on server and on the first client pass.
  // This ensures the server-side empty HTML matches the client's initial state.
  if (!mounted || !firebaseServices) {
    return null; 
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
