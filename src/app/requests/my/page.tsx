
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, doc, runTransaction, increment, serverTimestamp } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Inbox, CheckCircle2, Clock, MapPin, Star, History, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { RatingModal } from "@/components/profile/RatingModal";
import { sendNotification } from "@/firebase/notifications";
import { cn } from "@/lib/utils";

export default function MyRequestsHistoryPage() {
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const myRequestsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(
      collection(db, "requests"),
      where("createdBy", "==", user.uid)
    );
  }, [user?.uid, db]);

  const { data: rawMyRequests, isLoading } = useCollection(myRequestsQuery);

  const requests = useMemo(() => {
    if (!rawMyRequests) return [];
    return [...rawMyRequests].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawMyRequests]);

  const filteredRequests = useMemo(() => {
    const now = new Date();
    return requests.filter(req => {
      const isExpired = req.expiresAt?.toDate() < now && req.status === 'open';
      if (activeTab === "all") return true;
      if (activeTab === "active") return (req.status === 'open' || req.status === 'accepted') && !isExpired;
      if (activeTab === "completed") return req.status === 'completed';
      if (activeTab === "expired") return isExpired;
      return true;
    });
  }, [requests, activeTab]);

  const handleCompleteRequest = async (request: any) => {
    if (!db || !user) return;
    setActionLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", request.id);
        transaction.update(reqRef, { 
          status: "completed",
          completedAt: serverTimestamp()
        });
        
        if (request.acceptedBy) {
          const helperRef = doc(db, "users", request.acceptedBy);
          transaction.update(helperRef, { 
            totalHelped: increment(1) 
          });
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

      toast({ title: "Mission Completed", description: "Great job resolving this community need!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to mark as complete." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepost = (req: any) => {
    router.push(`/requests/new?cat=${req.category}&urg=${req.urgency}&title=${encodeURIComponent(req.title)}&desc=${encodeURIComponent(req.description)}`);
  };

  const getStatusBadge = (req: any) => {
    const isExpired = req.expiresAt?.toDate() < new Date() && req.status === 'open';
    if (isExpired) return <Badge className="bg-slate-100 text-slate-500 border-none font-bold uppercase text-[10px] h-6 px-3">Expired</Badge>;

    switch (req.status) {
      case "open": return <Badge className="bg-amber-100 text-amber-700 border-none font-bold uppercase text-[10px] h-6 px-3">Waiting for Help</Badge>;
      case "accepted": return <Badge className="bg-blue-100 text-blue-700 border-none font-bold uppercase text-[10px] h-6 px-3">Help is Coming</Badge>;
      case "completed": return <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold uppercase text-[10px] h-6 px-3">Completed</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-700 border-none font-bold uppercase text-[10px] h-6 px-3">{req.status}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high": return <Badge variant="destructive" className="uppercase text-[9px] font-black h-5">Critical</Badge>;
      case "medium": return <Badge className="bg-amber-500 text-white uppercase text-[9px] font-black h-5 border-none">Medium</Badge>;
      default: return <Badge className="bg-emerald-500 text-white uppercase text-[9px] font-black h-5 border-none">Normal</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <header className="bg-white border-b py-10 px-6">
        <div className="container max-w-5xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
              <History className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-headline font-bold text-slate-900 tracking-tight">Mission History</h1>
          </div>
          <p className="text-slate-500 font-medium">Tracking your broadcasts and successful matches across campus.</p>
        </div>
      </header>

      <main className="container max-w-5xl px-6 mx-auto mt-10">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white p-1.5 rounded-2xl shadow-sm border h-14 w-full md:w-fit grid grid-cols-4 mb-10">
            <TabsTrigger value="all" className="font-bold gap-2 rounded-xl">All</TabsTrigger>
            <TabsTrigger value="active" className="font-bold gap-2 rounded-xl">🟡 Active</TabsTrigger>
            <TabsTrigger value="completed" className="font-bold gap-2 rounded-xl">✅ Completed</TabsTrigger>
            <TabsTrigger value="expired" className="font-bold gap-2 rounded-xl">⏰ Expired</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
              <Inbox className="w-16 h-16 text-slate-200" />
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">
                  {activeTab === 'active' ? "No active requests. Need help? Post now!" : 
                   activeTab === 'completed' ? "No completed requests yet." : 
                   activeTab === 'expired' ? "No expired requests." : "You haven't posted any requests yet."}
                </h3>
                <p className="text-slate-500">Your community activity will appear here.</p>
              </div>
              {activeTab !== 'completed' && activeTab !== 'expired' && (
                <Button className="rounded-full font-bold h-11 px-8" asChild><Link href="/requests/new">Post a Need</Link></Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredRequests.map((req) => (
                <Card key={req.id} className="hover:shadow-xl transition-all bg-white border-none rounded-[2.5rem] overflow-hidden group">
                  <div className="flex flex-col md:flex-row">
                    <div className={cn(
                      "md:w-2",
                      req.urgency === 'high' ? "bg-red-500" : req.urgency === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    <div className="flex-grow p-8">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getUrgencyBadge(req.urgency)}
                            {getStatusBadge(req)}
                          </div>
                          <CardTitle className="text-2xl font-headline font-bold text-slate-900">{req.title}</CardTitle>
                          <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1">
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Posted {req.createdAt ? format(req.createdAt.toDate(), 'MMM dd, HH:mm') : 'Recently'}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {req.location?.area}</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-2xl flex items-center justify-center w-12 h-12 text-2xl shadow-inner">
                          {req.category === 'blood' ? '🩸' : req.category === 'tutor' ? '📚' : req.category === 'repair' ? '🔧' : req.category === 'emergency' ? '🚨' : '💬'}
                        </div>
                      </div>

                      <p className="text-slate-600 leading-relaxed mb-8 max-w-2xl">{req.description}</p>
                      
                      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-6 border-t border-slate-50">
                        <div className="w-full md:w-auto">
                          {req.status === 'accepted' && (
                            <div className="flex items-center gap-3">
                              <div className="bg-emerald-50 p-3 rounded-full"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                              <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Assigned Neighbor</p>
                                <p className="text-sm font-bold text-slate-900">Member #...{req.acceptedBy?.slice(-4)}</p>
                              </div>
                            </div>
                          )}
                          {req.status === 'completed' && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase text-slate-400">Resolved On</p>
                              <p className="text-sm font-bold text-emerald-600">{req.completedAt ? format(req.completedAt.toDate(), 'PPP') : 'Recently'}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                          {(req.status === 'completed' || (req.expiresAt?.toDate() < new Date() && req.status === 'open')) && (
                            <Button variant="outline" className="rounded-xl font-bold h-11 border-slate-200 gap-2" onClick={() => handleRepost(req)}>
                              <RefreshCw className="w-4 h-4" /> Repost Request
                            </Button>
                          )}
                          
                          {req.status === 'accepted' && (
                            <Button className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 px-6 shadow-lg shadow-emerald-500/20" onClick={() => handleCompleteRequest(req)} disabled={actionLoading}>
                              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Mark Completed
                            </Button>
                          )}

                          {req.status === 'completed' && req.acceptedBy && (
                            <RatingModal requestId={req.id} toUser={req.acceptedBy} />
                          )}

                          <Button variant="ghost" className="rounded-xl font-bold h-11 text-primary group-hover:bg-primary/5">
                            View Details <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Tabs>
      </main>
    </div>
  );
}
