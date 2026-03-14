
'use client';

import { 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  serverTimestamp,
  writeBatch,
  query,
  where,
  getDocs
} from 'firebase/firestore';

/**
 * Creates a chat for a specific request if it doesn't exist.
 */
export async function createChat(db: Firestore, request: any, acceptorId: string) {
  const chatId = request.id + '_chat';
  const chatRef = doc(db, 'chats', chatId);
  
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      requestId: request.id,
      requestTitle: request.title,
      participants: [request.createdBy, acceptorId],
      createdAt: serverTimestamp(),
      lastMessage: 'Chat started',
      lastMessageTime: serverTimestamp(),
      lastMessageBy: acceptorId,
      status: 'active'
    });
    
    // Add system message
    await addDoc(
      collection(db, 'chats', chatId, 'messages'),
      {
        text: 'Chat started. You can now coordinate!',
        senderId: 'system',
        senderName: 'System',
        timestamp: serverTimestamp(),
        read: true,
        type: 'system'
      }
    );
  }
}

/**
 * Closes a chat when a request is completed.
 */
export async function closeChat(db: Firestore, requestId: string) {
  const chatId = requestId + '_chat';
  const chatRef = doc(db, 'chats', chatId);
  
  const chatSnap = await getDoc(chatRef);
  if (chatSnap.exists()) {
    await updateDoc(chatRef, {
      status: 'closed'
    });
    
    await addDoc(
      collection(db, 'chats', chatId, 'messages'),
      {
        text: '✅ Request completed. This chat is now closed.',
        senderId: 'system',
        senderName: 'System',
        timestamp: serverTimestamp(),
        read: true,
        type: 'system'
      }
    );
  }
}

/**
 * Marks unread messages in a chat as read.
 */
export async function markMessagesAsRead(db: Firestore, chatId: string, userId: string) {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(
    messagesRef, 
    where('read', '==', false),
    where('senderId', '!=', userId)
  );
  
  const snap = await getDocs(q);
  if (snap.empty) return;
  
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    batch.update(d.ref, { read: true });
  });
  
  await batch.commit();
}
