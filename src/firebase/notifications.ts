
'use client';

import { collection, addDoc, Timestamp, Firestore } from 'firebase/firestore';

export interface Notification {
  id?: string;
  title: string;
  message: string;
  type: 'accepted' | 'completed' | 'rated' | 'system' | 'cancelled';
  link?: string;
  read: boolean;
  createdAt: Timestamp;
}

/**
 * Utility to send a notification to a specific user by writing to their subcollection.
 */
export async function sendNotification(
  db: Firestore,
  recipientId: string,
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
) {
  try {
    const notificationsRef = collection(db, 'notifications', recipientId, 'items');
    await addDoc(notificationsRef, {
      ...notification,
      read: false,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
