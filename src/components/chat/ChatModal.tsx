
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc
} from "firebase/firestore";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  X, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  Info,
  Loader2
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { markMessagesAsRead } from "@/firebase/chat";

interface ChatModalProps {
  requestId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatModal({ requestId, isOpen, onClose }: ChatModalProps) {
  const db = useFirestore();
  const { user } = useUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const chatId = requestId + '_chat';
  
  const chatRef = useMemoFirebase(() => (db ? doc(db, 'chats', chatId) : null), [db, chatId]);
  const { data: chat } = useDoc(chatRef);
  
  const otherUserId = useMemo(() => {
    if (!chat || !user) return null;
    return chat.participants.find((id: string) => id !== user.uid);
  }, [chat, user]);
  
  const otherUserRef = useMemoFirebase(() => (db && otherUserId ? doc(db, 'users', otherUserId) : null), [db, otherUserId]);
  const { data: otherUser } = useDoc(otherUserRef);

  // Listen for messages
  useEffect(() => {
    if (!db || !isOpen) return;
    
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      
      // Auto-mark as read
      if (user) {
        markMessagesAsRead(db, chatId, user.uid);
      }
    });
    
    return () => unsub();
  }, [db, chatId, isOpen, user]);

  // Listen for typing
  useEffect(() => {
    if (!db || !isOpen || !otherUserId) return;
    
    const typingRef = collection(db, 'chats', chatId, 'typing');
    const unsub = onSnapshot(typingRef, (snap) => {
      const typing = snap.docs.find(d => d.id !== user?.uid);
      if (typing) setOtherTyping(otherUser?.name || "Someone");
      else setOtherTyping(null);
    });
    
    return () => unsub();
  }, [db, chatId, isOpen, otherUserId, user, otherUser]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, otherTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !user || !chat) return;
    
    const text = inputText.trim();
    setInputText("");
    
    // Stop typing
    if (db) await deleteDoc(doc(db, 'chats', chatId, 'typing', user.uid));

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text,
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0],
        timestamp: serverTimestamp(),
        read: false,
        type: 'text'
      });
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        lastMessageBy: user.uid
      });
      
      // Notification
      if (otherUserId) {
        await addDoc(collection(db, 'notifications', otherUserId, 'items'), {
          type: 'chat_message',
          title: `Message from ${user.displayName || 'Neighbor'}`,
          message: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          chatId,
          requestId,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTyping = async (active: boolean) => {
    if (!db || !user) return;
    const typingDoc = doc(db, 'chats', chatId, 'typing', user.uid);
    if (active) {
      await setDoc(typingDoc, { timestamp: serverTimestamp() });
    } else {
      await deleteDoc(typingDoc);
    }
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d");
  };

  const isClosed = chat?.status === 'closed';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[450px] p-0 flex flex-col border-none shadow-2xl">
        <SheetHeader className="p-4 border-b bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full md:hidden" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.email}`} />
                <AvatarFallback className="bg-primary text-white font-bold">{otherUser?.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />
            </div>
            <div className="min-w-0 flex-grow">
              <SheetTitle className="text-base font-bold truncate leading-tight">{otherUser?.name || "Loading..."}</SheetTitle>
              <SheetDescription className="text-[10px] uppercase font-black text-slate-400 truncate flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {chat?.requestTitle || "Request Chat"}
              </SheetDescription>
            </div>
            {isClosed ? (
              <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[9px] uppercase">Closed</Badge>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[9px] uppercase">Active</Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-grow p-4 bg-slate-50/50 dark:bg-slate-950/50" ref={scrollRef}>
          <div className="space-y-6 pb-4">
            {messages.map((msg, i) => {
              const date = msg.timestamp?.toDate();
              const prevDate = i > 0 ? messages[i-1].timestamp?.toDate() : null;
              const showDate = date && (!prevDate || formatDate(date) !== formatDate(prevDate));
              const isMe = msg.senderId === user?.uid;
              const isSystem = msg.type === 'system';

              return (
                <div key={msg.id} className="space-y-4">
                  {showDate && (
                    <div className="flex items-center justify-center gap-4 py-2">
                      <div className="h-px flex-grow bg-slate-200 dark:bg-slate-800" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(date)}</span>
                      <div className="h-px flex-grow bg-slate-200 dark:bg-slate-800" />
                    </div>
                  )}

                  {isSystem ? (
                    <div className="flex flex-col items-center gap-1 italic text-slate-400 text-xs px-8 text-center leading-relaxed">
                      {msg.text}
                    </div>
                  ) : (
                    <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
                      {!isMe && (
                        <Avatar className="h-6 w-6 mb-1">
                          <AvatarFallback className="text-[8px] font-bold">{msg.senderName?.[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn(
                        "max-w-[80%] space-y-1",
                        isMe ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "px-4 py-2.5 text-sm shadow-sm",
                          isMe 
                            ? "bg-primary text-white rounded-2xl rounded-br-none" 
                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700"
                        )}>
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-1 px-1">
                          <span className="text-[9px] font-bold text-slate-400">{date ? format(date, "HH:mm") : "..."}</span>
                          {isMe && (
                            <span className={cn("text-[9px] font-black", msg.read ? "text-primary" : "text-slate-300")}>
                              {msg.read ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {otherTyping && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[8px] font-bold">?</AvatarFallback>
                </Avatar>
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{otherTyping} is typing...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-white dark:bg-slate-900">
          {isClosed ? (
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 text-slate-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-xs font-bold">Mission completed. This chat is now archived.</p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="relative flex items-center gap-2">
              <Input
                placeholder="Type your message..."
                className="flex-grow h-12 rounded-2xl bg-slate-50 border-none focus-visible:ring-primary/20 pr-12"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={() => handleTyping(true)}
                onBlur={() => handleTyping(false)}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!inputText.trim()}
                className="absolute right-1 top-1 h-10 w-10 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-30"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
