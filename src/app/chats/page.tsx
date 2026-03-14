
"use client";

import { useState, useMemo } from "react";
import { query, collection, where } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, Inbox, Loader2, Search, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { ChatModal } from "@/components/chat/ChatModal";
import { cn } from "@/lib/utils";

export default function ChatsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "chats"), where("participants", "array-contains", user.uid));
  }, [db, user?.uid]);

  const { data: rawChats, isLoading } = useCollection(chatsQuery);

  const chats = useMemo(() => {
    if (!rawChats) return [];
    return [...rawChats]
      .filter(chat => {
        const title = chat.requestTitle || "";
        const lastMsg = chat.lastMessage || "";
        return title.toLowerCase().includes(searchQuery.toLowerCase()) || 
               lastMsg.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => (b.lastMessageTime?.toMillis() || 0) - (a.lastMessageTime?.toMillis() || 0));
  }, [rawChats, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="bg-white border-b py-8 px-6">
        <div className="container max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-headline font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-primary" /> My Conversations
              </h1>
              <p className="text-slate-500 font-medium">Coordinate with neighbors on active and past missions.</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-11 h-11 bg-slate-50 border-none rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl px-6 mx-auto py-8">
        {chats.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed space-y-6 max-w-xl mx-auto shadow-sm">
            <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto">
              <Inbox className="w-12 h-12 text-slate-200" />
            </div>
            <div className="space-y-2 px-8">
              <h3 className="text-2xl font-bold text-slate-900">No conversations yet</h3>
              <p className="text-slate-500">Chats will appear here automatically when someone accepts your request or you offer to help someone.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {chats.map((chat) => (
              <Card 
                key={chat.id} 
                className="rounded-3xl border-none shadow-sm hover:shadow-xl transition-all cursor-pointer group bg-white dark:bg-slate-900 overflow-hidden"
                onClick={() => setSelectedRequestId(chat.requestId)}
              >
                <div className="p-6 flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-14 w-14 border-2 border-white dark:border-slate-800 shadow-md">
                      <AvatarFallback className="bg-primary/10 text-primary font-black text-lg">
                        {chat.requestTitle?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {chat.status === 'active' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900" />
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-grow space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">
                        {chat.requestTitle}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                        {chat.lastMessageTime ? formatDistanceToNow(chat.lastMessageTime.toDate()) : "Recently"}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-500 line-clamp-1 flex items-center gap-2">
                      {chat.lastMessageBy === user?.uid && <span className="font-bold text-primary">You:</span>}
                      {chat.lastMessage}
                    </p>
                    
                    <div className="flex items-center gap-3 pt-1">
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-black uppercase border-none h-5 px-2",
                        chat.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                      )}>
                        {chat.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {selectedRequestId && (
        <ChatModal 
          requestId={selectedRequestId} 
          isOpen={!!selectedRequestId} 
          onClose={() => setSelectedRequestId(null)} 
        />
      )}
    </div>
  );
}
