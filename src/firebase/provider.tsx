'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Loader2 } from 'lucide-react';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isAuthInitialized: boolean;
  unreadChatCount: number;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isAuthInitialized: boolean;
}

export interface UserHookResult {
  user: User | null;
  currentUser: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isAuthInitialized: boolean;
  authInitialized: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * Main Firebase Provider that gates the application until Auth state is determined.
 * This prevents race conditions where Firestore listeners start before Auth is ready.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      setIsAuthInitialized(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
        setIsAuthInitialized(true);
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
        setIsAuthInitialized(true);
      }
    );
    return () => unsubscribe();
  }, [auth]);

  // Centralized Notification Listener for Chat Unread Count
  useEffect(() => {
    if (!firestore || !userAuthState.user?.uid) {
      setUnreadChatCount(0);
      return;
    }

    const q = query(
      collection(firestore, "notifications", userAuthState.user.uid, "items"),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => {
      const chatUnread = snap.docs.filter(d => d.data().type === 'chat_message');
      setUnreadChatCount(chatUnread.length);
    });

    return () => unsub();
  }, [firestore, userAuthState.user?.uid]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      isAuthInitialized,
      unreadChatCount,
    };
  }, [firebaseApp, firestore, auth, userAuthState, isAuthInitialized, unreadChatCount]);

  if (!isAuthInitialized) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Establishing Secure Connection...
        </p>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    isAuthInitialized: context.isAuthInitialized,
  };
};

export const useAuth = () => {
  const { auth, user, isAuthInitialized } = useFirebase();
  return {
    auth,
    user,
    currentUser: user,
    authInitialized: isAuthInitialized,
  };
};

export const useUnreadChatCount = () => {
  const context = useContext(FirebaseContext);
  return context?.unreadChatCount || 0;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError, isAuthInitialized } = useFirebase();
  return { 
    user, 
    currentUser: user,
    isUserLoading, 
    userError, 
    isAuthInitialized,
    authInitialized: isAuthInitialized 
  };
};
