
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, where, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { useUser, useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { AlertCircle, X, ChevronRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CriticalAlertBanner() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!db || !user?.uid) return;

    // Listen specifically for new unread critical notifications
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      where("read", "==", false),
      where("urgency", "==", "high"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
        
        // Only show if it's new (created in the last 15 seconds)
        const ageInSecs = (Date.now() - data.createdAt?.toDate().getTime()) / 1000;
        if (ageInSecs < 15) {
          setActiveAlert(data);
          setVisible(true);
          
          // Auto-dismiss after 10 seconds
          const timer = setTimeout(() => {
            setVisible(false);
          }, 10000);
          
          return () => clearTimeout(timer);
        }
      }
    });

    return () => unsubscribe();
  }, [db, user?.uid]);

  const handleDismiss = () => {
    setVisible(false);
  };

  const handleView = () => {
    if (!activeAlert || !db || !user) return;
    updateDocumentNonBlocking(doc(db, "notifications", user.uid, "items", activeAlert.id), { read: true });
    setVisible(false);
    router.push(`/volunteer/missions?id=${activeAlert.requestId}`);
  };

  if (!visible || !activeAlert) return null;

  return (
    <div className="fixed top-20 left-0 right-0 z-[100] px-4 animate-in slide-in-from-top-full duration-500">
      <div className="max-w-xl mx-auto bg-red-600 text-white rounded-2xl shadow-2xl overflow-hidden flex items-stretch border-2 border-red-500/50 ring-4 ring-red-500/10">
        <div className="bg-red-700 px-4 flex items-center justify-center animate-pulse">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="flex-grow p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Critical Request</span>
            <span className="text-[10px] font-bold opacity-70 flex items-center gap-1"><Bell className="w-3 h-3" /> Just Now</span>
          </div>
          <h4 className="font-bold text-sm line-clamp-1">{activeAlert.title || "Urgent help needed!"}</h4>
          <p className="text-xs opacity-90 line-clamp-1">{activeAlert.area || "Nearby campus area"}</p>
        </div>
        <div className="flex items-center gap-2 pr-4 pl-2">
          <Button 
            size="sm" 
            className="bg-white text-red-600 hover:bg-red-50 font-bold rounded-xl h-9"
            onClick={handleView}
          >
            View <ChevronRight className="ml-1 w-3 h-3" />
          </Button>
          <button 
            onClick={handleDismiss}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
