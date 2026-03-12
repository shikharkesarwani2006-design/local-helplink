
"use client";

import { useState, useMemo } from "react";
import { collection, query, where, doc, runTransaction, increment } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Inbox, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { RatingModal } from "@/components/profile/RatingModal";
import { sendNotification } from "@/firebase/notifications";

export default function MyRequests() {
  const [actionLoading, setActionLoading] = useState(false);
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const myRequestsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(
      collection(db, "requests"),
      where("createdBy", "==", user.uid)
    );
  }, [user?.uid, db]);

  const { data: rawMyRequests, isLoading } = useCollection(myRequestsQuery);

  const myRequests = useMemo(() => {
    if (!rawMyRequests) return null;
    return [...rawMyRequests].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawMyRequests]);

  const handleCompleteRequest = async (request: any) => {
    if (!db || !user) return;
    setActionLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", request.id);
        transaction.update(reqRef, { status: "completed" });
        
        if (request.acceptedBy) {
          const volunteerRef = doc(db, "users", request.acceptedBy);
          transaction.update(volunteerRef, { totalHelped: increment(1) });
        }
      });

      if (request.acceptedBy) {
        await sendNotification(db, request.acceptedBy, {
          title: "Mission Completed! 🏆",
          message: `Your neighbor confirmed you completed the mission: "${request.title}"`,
          type: "completed",
          link: "/profile"
        });
      }

      toast({
        title: "Mission Completed",
        description: "Great job resolving this community need!",
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to mark as complete." });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-700";
      case "accepted": return "bg-amber-100 text-amber-700";
      case "completed": return "bg-emerald-100 text-emerald-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <header className="bg-white border-b py-8">
        <div className="container px-6 mx-auto">
          <h1 className="text-3xl font-headline font-bold text-secondary">My Request History</h1>
          <p className="text-slate-500">Manage missions you've broadcasted to the community</p>
        </div>
      </header>

      <main className="container px-6 mx-auto mt-8">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>
        ) : !myRequests || myRequests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-secondary/30">
            <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">You haven't posted any help requests yet.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {myRequests.map((req) => (
              <Card key={req.id} className="hover:shadow-lg transition-all bg-white border-none rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between py-6">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-headline font-bold text-slate-900">{req.title}</CardTitle>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" />
                      {req.createdAt ? formatDistanceToNow(req.createdAt.toDate()) : "just now"} ago
                    </div>
                  </div>
                  <Badge className={`capitalize px-4 py-1.5 rounded-full font-bold border-none ${getStatusColor(req.status)}`}>
                    {req.status}
                  </Badge>
                </CardHeader>
                <CardContent className="pb-6">
                  <p className="text-slate-600 leading-relaxed">{req.description}</p>
                  
                  {req.status === 'accepted' && (
                    <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg"><CheckCircle2 className="text-primary w-5 h-5" /></div>
                        <p className="text-sm font-bold text-slate-700">A neighbor is currently helping you.</p>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90 text-white font-bold rounded-full"
                        onClick={() => handleCompleteRequest(req)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark Completed"}
                      </Button>
                    </div>
                  )}

                  {req.status === 'completed' && req.acceptedBy && (
                    <div className="mt-6 flex justify-end">
                      <RatingModal requestId={req.id} toUser={req.acceptedBy} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
