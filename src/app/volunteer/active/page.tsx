"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  doc, 
  runTransaction,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { 
  useFirestore, 
  useUser, 
  useDoc, 
  useCollection, 
  useMemoFirebase,
  updateDocumentNonBlocking
} from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Phone, 
  XCircle, 
  Loader2, 
  PartyPopper,
  MessageSquare,
  AlertTriangle,
  Inbox
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { sendNotification } from "@/firebase/notifications";
import { useToast } from "@/hooks/use-toast";

/**
 * Helper component to fetch and display requester contact info securely.
 */
function RequesterContactInfo({ userId }: { userId: string }) {
  const db = useFirestore();
  const profileRef = useMemoFirebase(() => (db ? doc(db, "users", userId) : null), [db, userId]);
  const { data: profile } = useDoc(profileRef);

  if (!profile) return <div className="animate-pulse h-12 bg-slate-100 rounded-xl" />;

  return (
    <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email}`} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">{profile.name?.[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Requester</p>
          <h4 className="font-bold text-slate-900 dark:text-white leading-none">{profile.name}</h4>
          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> {profile.location?.area || "Campus Area"}
          </p>
        </div>
      </div>
      
      <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800 flex flex-wrap gap-2">
        {profile.phone ? (
          <Button asChild variant="outline" size="sm" className="rounded-full font-bold gap-2 bg-white dark:bg-slate-900">
            <a href={`tel:${profile.phone}`}>
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              {profile.phone}
            </a>
          </Button>
        ) : (
          <Badge variant="outline" className="text-slate-400 font-medium bg-white/50">Phone not provided</Badge>
        )}
        <Button variant="outline" size="sm" className="rounded-full font-bold gap-2 bg-white dark:bg-slate-900">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          In-App Message
        </Button>
      </div>
    </div>
  );
}

/**
 * Live counter for elapsed time since mission acceptance.
 */
function ElapsedTimeCounter({ startTime }: { startTime: any }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(formatDistanceToNow(startTime.toDate(), { addSuffix: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
      <Clock className="w-3.5 h-3.5" />
      <span>Active for {elapsed || "..."}</span>
    </div>
  );
}

export default function MyActiveMissionsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowSuccess] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState<any>(null);
  const [totalHelpedCount, setTotalHelpedCount] = useState(0);

  // 1. Fetch Active Missions
  const activeMissionsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "requests"),
      where("acceptedBy", "==", user.uid),
      where("status", "==", "accepted"),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);
  const { data: missions, isLoading: isMissionsLoading } = useCollection(activeMissionsQuery);

  // 2. Fetch User Profile for Total Helped Stats
  const profileRef = useMemoFirebase(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  useEffect(() => {
    if (profile) setTotalHelpedCount(profile.totalHelped || 0);
  }, [profile]);

  const handleMarkComplete = async (request: any) => {
    if (!db || !user) return;
    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", request.id);
        const userRef = doc(db, "users", user.uid);
        
        transaction.update(reqRef, { 
          status: "completed",
          completedAt: serverTimestamp()
        });
        transaction.update(userRef, { 
          totalHelped: increment(1) 
        });
      });

      // Notify Requester
      await sendNotification(db, request.createdBy, {
        title: "Mission Completed! 🎉",
        message: `Your neighbor marked your request "${request.title}" as complete. Please leave a rating!`,
        type: "completed",
        link: "/profile"
      });

      setShowSuccess(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMission = async () => {
    if (!db || !user || !cancellingRequest) return;
    setLoading(true);
    try {
      await updateDocumentNonBlocking(doc(db, "requests", cancellingRequest.id), {
        status: "open",
        acceptedBy: null,
        acceptedAt: null
      });

      // Notify Requester
      await sendNotification(db, cancellingRequest.createdBy, {
        title: "Volunteer Cancelled",
        message: `The volunteer had to cancel. Your request "${cancellingRequest.title}" is open for others.`,
        type: "cancelled",
        link: "/requests/my"
      });

      toast({ title: "Mission Cancelled", description: "The request is back in the public feed." });
      setCancellingRequest(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to cancel mission." });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading || isMissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20">
      <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-10 px-6">
        <div className="container max-w-5xl mx-auto space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-headline font-bold text-slate-900 dark:text-white tracking-tight">Active Missions</h1>
          </div>
          <p className="text-slate-500 font-medium">Missions you are currently committed to fulfilling.</p>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto py-12 px-6">
        {missions?.length === 0 ? (
          <Card className="border-2 border-dashed bg-white dark:bg-slate-900 rounded-[2.5rem] py-20 text-center space-y-6">
            <Inbox className="w-16 h-16 text-slate-200 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Active Commitments</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Help build your community rank by accepting a mission from the feed.</p>
            </div>
            <Button className="rounded-full font-bold px-8 h-12 shadow-xl shadow-primary/20" onClick={() => router.push('/volunteer/missions')}>
              Browse Available Missions
            </Button>
          </Card>
        ) : (
          <div className="grid gap-10">
            {missions?.map((req) => (
              <Card key={req.id} className="relative overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] flex flex-col md:flex-row transition-all hover:scale-[1.01]">
                <div className={cn(
                  "w-2 md:w-3 shrink-0",
                  req.urgency === 'high' ? "bg-red-500" : req.urgency === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                )} />
                
                <div className="flex-grow p-8 space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="uppercase text-[10px] font-black tracking-widest bg-slate-50 dark:bg-slate-800 border-none">
                          {req.category}
                        </Badge>
                        <Badge className={cn(
                          "uppercase text-[10px] font-black tracking-widest",
                          req.urgency === 'high' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {req.urgency} Urgency
                        </Badge>
                      </div>
                      <CardTitle className="text-3xl font-headline font-bold text-slate-900 dark:text-white leading-tight">
                        {req.title}
                      </CardTitle>
                    </div>
                    {req.acceptedAt && <ElapsedTimeCounter startTime={req.acceptedAt} />}
                  </div>

                  <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {req.description}
                    </p>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-8 pt-4">
                    <RequesterContactInfo userId={req.createdBy} />
                    
                    <div className="flex flex-col justify-end gap-3">
                      <Button 
                        className="h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                        onClick={() => handleMarkComplete(req)}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                        Mark as Completed
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold gap-2 h-10 rounded-xl"
                        onClick={() => setCancellingRequest(req)}
                      >
                        <XCircle className="w-4 h-4" /> Cancel Mission
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 🚀 Celebration Modal */}
      <Dialog open={showCelebration} onOpenChange={(open) => {
        if (!open) {
          setShowSuccess(false);
          router.push('/volunteer/missions');
        }
      }}>
        <DialogContent className="rounded-[3rem] p-12 text-center max-w-lg border-none shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-white -z-10" />
          <div className="bg-emerald-100 dark:bg-emerald-950/30 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
            <PartyPopper className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-4xl font-headline font-bold text-slate-900 dark:text-white mb-4">Great job! 🎉</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-10 text-lg leading-relaxed">
            You've successfully helped a neighbor. You've now supported <span className="text-emerald-600 font-black">{totalHelpedCount} citizens</span> in our campus network!
          </p>
          <div className="space-y-3">
            <Button 
              className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold text-lg shadow-2xl transition-all active:scale-95"
              onClick={() => {
                setShowSuccess(false);
                router.push('/volunteer/missions');
              }}
            >
              Back to Browse Missions
            </Button>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Neighborhood impact points added</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🛠 Cancel Modal */}
      <Dialog open={!!cancellingRequest} onOpenChange={(open) => !open && setCancellingRequest(null)}>
        <DialogContent className="rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" /> Cancel Mission?
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-500 font-medium">
              If you can no longer help, cancelling will put this mission back in the global feed for another neighbor to pick up.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium">
              The requester will be notified that you are unable to fulfill the request.
            </div>
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" className="flex-1 rounded-2xl font-bold h-12 text-slate-500" onClick={() => setCancellingRequest(null)}>Stay Helping</Button>
            <Button 
              variant="destructive" 
              className="flex-1 rounded-2xl font-bold h-12 shadow-lg shadow-red-500/20" 
              onClick={handleCancelMission} 
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
