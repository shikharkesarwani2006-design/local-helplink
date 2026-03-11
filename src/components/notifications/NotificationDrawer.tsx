
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCircle2, Star, Zap, Clock, Inbox, MoreHorizontal, AlertCircle, MessageSquare } from "lucide-react";
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  updateDocumentNonBlocking 
} from "@/firebase";
import { query, collection, orderBy, doc, writeBatch } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function NotificationDrawer() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const prevUnreadCount = useRef(0);

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "notifications", user.uid, "items"),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);

  const { data: notifications, isLoading } = useCollection(notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  // Desktop Notifications & Haptics
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current && !open) {
      // Haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      // Browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        const lastNotif = notifications?.find(n => !n.read);
        if (lastNotif) {
          new Notification(lastNotif.title || "New HelpLink Alert", {
            body: lastNotif.message,
          });
        }
      }
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, notifications, open]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleMarkAllRead = async () => {
    if (!db || !user?.uid || !notifications) return;
    const unreadOnes = notifications.filter(n => !n.read);
    if (unreadOnes.length === 0) return;

    const batch = writeBatch(db);
    unreadOnes.forEach(n => {
      batch.update(doc(db, "notifications", user.uid, "items", n.id), { read: true });
    });
    await batch.commit();
  };

  const handleNotificationClick = (n: any) => {
    if (!db || !user?.uid) return;
    if (!n.read) {
      updateDocumentNonBlocking(doc(db, "notifications", user.uid, "items", n.id), { read: true });
    }
    setOpen(false);
    
    // Intelligent Navigation
    if (n.type === 'new_request') {
      router.push(`/volunteer/missions?id=${n.requestId}`);
    } else if (n.type === 'accepted' || n.type === 'completed') {
      router.push('/profile');
    } else if (n.type === 'rated') {
      router.push('/profile?tab=reviews');
    }
  };

  const getNotificationIcon = (type: string, urgency?: string) => {
    switch (type) {
      case 'new_request': return <AlertCircle className={cn("w-4 h-4", urgency === 'high' ? "text-red-500" : "text-primary")} />;
      case 'accepted': return <Zap className="w-4 h-4 text-primary" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'rated': return <Star className="w-4 h-4 text-amber-500" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-slate-100">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md w-full p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-2xl font-headline font-bold">Activity Feed</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-primary font-bold h-7 px-2">
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription>Real-time updates on your neighborhood missions.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-grow">
          <div className="divide-y">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400">
                <MoreHorizontal className="w-8 h-8 animate-pulse mx-auto mb-2" />
                <p className="text-sm font-medium">Syncing alerts...</p>
              </div>
            ) : notifications?.length === 0 ? (
              <div className="p-12 text-center">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="font-bold text-slate-900">You're all caught up!</h3>
                <p className="text-sm text-slate-500 mt-1">No notifications to show right now.</p>
              </div>
            ) : (
              notifications?.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-6 flex gap-4 transition-colors hover:bg-slate-50/50 cursor-pointer ${!n.read ? 'bg-indigo-50/30 border-l-4 border-l-primary' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className={`mt-1 h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${!n.read ? 'bg-white shadow-sm ring-1 ring-indigo-100' : 'bg-slate-100'}`}>
                    {getNotificationIcon(n.type, n.urgency)}
                  </div>
                  <div className="space-y-1 flex-grow">
                    <div className="flex justify-between items-start gap-2">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                        {n.title || (n.type === 'new_request' ? "Help Needed Nearby" : "Update")}
                      </p>
                      {n.urgency === 'high' && (
                        <Badge className="bg-red-50 text-red-600 border-none text-[8px] font-black uppercase px-1.5 h-4">Critical</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {n.createdAt ? formatDistanceToNow(n.createdAt.toDate()) : "just now"} ago
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <SheetFooter className="p-6 border-t bg-slate-50/50">
           <Button variant="outline" className="w-full font-bold" onClick={() => setOpen(false)}>Close Activity Feed</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
