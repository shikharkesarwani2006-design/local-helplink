
"use client";

import { query, collection, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";

export function AnnouncementBanner() {
  const db = useFirestore();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const announcementsQuery = useMemoFirebase(() => {
    if (!db) return null;
    // Removed orderBy to avoid composite index requirement
    return query(
      collection(db, "announcements"), 
      where("active", "==", true)
    );
  }, [db]);

  const { data: rawAnnouncements } = useCollection(announcementsQuery);
  
  // Sort in JS instead of Firestore
  const latest = useMemo(() => {
    if (!rawAnnouncements || rawAnnouncements.length === 0) return null;
    return [...rawAnnouncements].sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    })[0];
  }, [rawAnnouncements]);

  if (!latest || latest.id === dismissedId) return null;

  const styles = {
    critical: "bg-red-600 text-white border-red-700",
    warning: "bg-amber-500 text-white border-amber-600",
    info: "bg-primary text-white border-primary-foreground/10"
  };

  const icons = {
    critical: <AlertCircle className="w-5 h-5 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 shrink-0" />,
    info: <Info className="w-5 h-5 shrink-0" />
  };

  return (latest.active && (
    <div className={cn(
      "w-full py-3 px-6 flex items-center justify-between gap-4 border-b animate-in slide-in-from-top duration-500 relative z-40",
      styles[latest.urgency as keyof typeof styles]
    )}>
      <div className="container mx-auto flex items-center gap-4">
        {icons[latest.urgency as keyof typeof icons]}
        <div className="flex-grow">
          <p className="text-sm font-black uppercase tracking-widest opacity-70 leading-none mb-0.5">Community Announcement</p>
          <p className="text-sm font-bold leading-tight">
            {latest.title}: <span className="font-medium opacity-90">{latest.message}</span>
          </p>
        </div>
        <button 
          onClick={() => setDismissedId(latest.id)}
          className="p-1.5 hover:bg-black/10 rounded-full transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )) || null;
}
