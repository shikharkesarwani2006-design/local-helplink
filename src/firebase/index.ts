'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Persist SDK instances in a module-level variable to prevent 
 * re-initialization during HMR (Hot Module Replacement).
 */
let cachedSdks: {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} | null = null;

/**
 * Initializes Firebase with the provided configuration.
 * Uses the existing app instance and cached SDKs if available.
 */
export function initializeFirebase() {
  if (cachedSdks) return cachedSdks;

  const existingApp = getApps().at(0);
  const firebaseApp = existingApp || initializeApp(firebaseConfig);
  
  cachedSdks = {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };

  return cachedSdks;
}

// Barrel exports
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
