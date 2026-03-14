"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  CheckCircle2, 
  Star, 
  Zap, 
  Clock, 
  Inbox, 
  MoreHorizontal, 
  AlertCircle, 
  Sparkles, 
  AlertTriangle,
  Loader2 
} from "lucide-react";
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useDoc,
  useMemoFirebase, 
  updateDocumentNonBlocking 
} from "@/firebase";
import { collection, doc, writeBatch, query, where } from "firebase/firestore";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

export function NotificationDrawer() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const prevUnreadCount = useRef(0);

  const userRef = useMemoFirebase(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userRef);

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "notifications", user.uid, "items"));
  }, [db, user?.uid]);

  const { data: rawNotifications, isLoading } = useCollection(notificationsQuery);

  const notifications = useMemo(() => {
    if (!rawNotifications) return [];
    return [...rawNotifications].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawNotifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const groupedNotifications = useMemo(() => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const earlier: any[] = [];

    notifications.forEach(n => {
      const date = n.createdAt?.toDate() || new Date();
      if (isToday(date)) today.push(n);
      else if (isYesterday(date)) yesterday.push(n);
      else earlier.push(n);
    });

    return { today, yesterday, earlier };
  }, [notifications]);

  useEffect(() => {
    if (unreadCount > prevUnreadCount.current && !open) {
      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, open]);

  const handleMarkAllRead = async () => {
    if (!db || !user?.uid || !notifications) return;
    const unreadOnes = notifications.filter(n => !n.read);
    if (unreadOnes.length === 0) return;
    const batch = writeBatch(db);
    unreadOnes.forEach(n => batch.update(doc(db, "notifications", user.uid, "items", n.id), { read: true }));
    await batch.commit();
  };

  const handleNotificationClick = (n: any) => {
    if (!db || !user?.uid) return;
    if (!n.read) updateDocumentNonBlocking(doc(db, "notifications", user.uid, "items", n.id), { read: true });
    setOpen(false);
    
    if (n.type === 'new_request') {
      if (profile?.role === 'provider') router.push(`/provider/jobs?id=${n.requestId}`);
      else router.push(`/volunteer/missions?id=${n.requestId}`);
    } else if (n.type === 'accepted' || n.type === 'completed') {
      router.push('/profile');
    } else if (n.type === 'rated') {
      router.push('/profile');
    }
  };

  const getNotificationIcon = (type: string, urgency?: string) => {
    switch (type) {
      case 'accepted': return <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>;
      case 'completed': return <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600"><Sparkles className="w-5 h-5" /></div>;
      case 'rated': return <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500"><Star className="w-5 h-5 fill-amber-500" /></div>;
      case 'new_request': return <div className={cn("p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600", urgency === 'high' && "bg-red-50 text-red-600")}><Zap className="w-5 h-5" /></div>;
      case 'warning': return <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600"><AlertTriangle className="w-5 h-5" /></div>;
      default: return <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400"><Bell className="w-5 h-5" /></div>;
    }
  };

  const NotificationList = ({ items, title }: { items: any[], title: string }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <div className="px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-y dark:border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</p>
        </div>
        {items.map((n) => (
          <div 
            key={n.id} 
            className={cn(
              "p-6 flex gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer relative group",
              !n.read && "bg-indigo-50/30 dark:bg-indigo-950/10"
            )} 
            onClick={() => handleNotificationClick(n)}
          >
            {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
            {getNotificationIcon(n.type, n.urgency)}
            <div className="space-y-1 flex-grow">
              <div className="flex justify-between items-start gap-2">
                <p className={cn("text-sm leading-snug", !n.read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400')}>
                  {n.title}
                </p>
                {n.urgency === 'high' && <Badge variant="destructive" className="text-[8px] font-black uppercase h-4 px-1.5">Critical</Badge>}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-2">{n.message}</p>
              <div className="flex items-center gap-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                <Clock className="w-3 h-3" /> {n.createdAt ? formatDistanceToNow(n.createdAt.toDate()) : "just now"} ago
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md w-full p-0 flex flex-col border-none shadow-2xl">
        <SheetHeader className="p-6 border-b dark:border-slate-800">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-2xl font-headline font-bold">Activity Feed</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-primary font-bold h-8 px-3 rounded-full hover:bg-primary/5">
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription className="dark:text-slate-400">Real-time updates on your neighborhood missions.</SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-grow">
          {isLoading ? (
            <div className="p-20 text-center text-slate-400 flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium tracking-widest uppercase">Syncing alerts...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-inner">
                <Inbox className="w-10 h-10 text-slate-200 dark:text-slate-800" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">You're all caught up!</h3>
                <p className="text-sm text-slate-500 max-w-[200px] mx-auto">New community notifications will appear here as they happen.</p>
              </div>
            </div>
          ) : (
            <div className="pb-10">
              <NotificationList items={groupedNotifications.today} title="Today" />
              <NotificationList items={groupedNotifications.yesterday} title="Yesterday" />
              <NotificationList items={groupedNotifications.earlier} title="Earlier" />
            </div>
          )}
        </ScrollArea>
        
        <SheetFooter className="p-6 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button variant="outline" className="w-full h-12 rounded-2xl font-bold" onClick={() => setOpen(false)}>
            Dismiss Activity Feed
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}