
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
export async function createChat(db: Firestore, request: any, acceptorId: string, pricing?: any) {
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
    
    // Add primary system message
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

    // Add pricing system message
    let pricingMsg = "🤝 Provider is offering free service.";
    if (pricing && !pricing.isFreeService) {
      const typeLabel = pricing.chargeType === 'fixed' ? 'Fixed' : pricing.chargeType === 'hourly' ? 'Per Hour' : 'Negotiable';
      pricingMsg = `💰 Service charge agreed: ₹${pricing.serviceCharge} (${typeLabel}). Please pay after service is completed.`;
    }
    
    await addDoc(
      collection(db, 'chats', chatId, 'messages'),
      {
        text: pricingMsg,
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
  
  // Refactored to avoid composite index: Fetch all messages and filter in JS
  const snap = await getDocs(messagesRef);
  if (snap.empty) return;
  
  const unreadMessages = snap.docs.filter(d => {
    const data = d.data();
    return data.read === false && data.senderId !== userId;
  });

  if (unreadMessages.length === 0) return;
  
  const batch = writeBatch(db);
  unreadMessages.forEach(d => {
    batch.update(d.ref, { read: true });
  });
  
  await batch.commit();
}
