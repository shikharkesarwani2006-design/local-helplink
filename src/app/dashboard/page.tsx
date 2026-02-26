"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  where, 
  doc, 
  Timestamp, 
  writeBatch, 
  getDocs,
  limit
} from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Search, 
  ArrowRight, 
  Users, 
  Flame, 
  Trophy,
  Droplets,
  BookOpen,
  Wrench,
  AlertCircle,
  PlusCircle,
  History,
  AlertTriangle,
  Zap,
  Phone,
  MessageSquare,
  ChevronRight,
  Heart,
  Star
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { sendNotification } from "@/firebase/notifications";

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Auto-expire cleanup logic
  useEffect(() => {
    if (!db || !user) return;
    const cleanupExpiredRequests = async () => {
      const now = Timestamp.now();
      const q = query(
        collection(db, "requests"),
        where("status", "==", "open"),
        where("expiresAt", "<", now),
        limit(20)
      );
      try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => {
          batch.update(d.ref, { status: "expired" });
          sendNotification(db, d.data().createdBy, {
            title: "Request Expired",
            message: `Your request "${d.data().title}" has expired.`,
            type: "system",
            link: "/requests/my"
          });
        });
        await batch.commit();
      } catch (err) { console.error("Cleanup error:", err); }
    };
    cleanupExpiredRequests();
  }, [db, user]);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
  }, [db, user]);

  const { data: allRequests, isLoading } = useCollection(requestsQuery);

  const leaderboardQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users"),
      orderBy("totalHelped", "desc"),
      where("totalHelped", ">", 0),
      limit(5)
    );
  }, [db, user]);

  const { data: topHelpers } = useCollection(leaderboardQuery);

  const urgencyPriority: Record<string, number> = { critical: 3, medium: 2, normal: 1 };

  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests
      .filter(req => {
        const matchesSearch = 
          req.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          req.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || req.category === categoryFilter;
        const matchesUrgency = urgencyFilter === "all" || req.urgency === urgencyFilter;
        const now = new Date();
        const expiresAt = req.expiresAt instanceof Timestamp ? req.expiresAt.toDate() : (req.expiresAt ? new Date(req.expiresAt) : null);
        const notExpired = !expiresAt || expiresAt > now;
        return matchesSearch && matchesCategory && matchesUrgency && notExpired;
      })
      .sort((a, b) => {
        const priorityA = urgencyPriority[a.urgency] || 0;
        const priorityB = urgencyPriority[b.urgency] || 0;
        if (priorityA !== priorityB) return priorityB - priorityA;
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
  }, [allRequests, searchQuery, categoryFilter, urgencyFilter]);

  const handleAcceptRequest = async (request: any) => {
    if (!user || !db) return;
    const requestRef = doc(db, "requests", request.id);
    const now = Timestamp.now();
    const createdDate = request.createdAt instanceof Timestamp ? request.createdAt.toDate() : (request.createdAt ? new Date(request.createdAt) : new Date());
    const responseTimeMinutes = Math.max(0, Math.floor((now.toMillis() - createdDate.getTime()) / 60000));

    updateDocumentNonBlocking(requestRef, {
      status: "accepted",
      acceptedBy: user.uid,
      responseTime: responseTimeMinutes,
    });

    sendNotification(db, request.createdBy, {
      title: "Mission Accepted!",
      message: `${user.displayName || "A neighbor"} has accepted your request: "${request.title}".`,
      type: "accepted",
      link: `/requests/my`
    });

    toast({
      title: "Help Accepted!",
      description: "You've successfully claimed this request. Connect with the requester now.",
    });
    setSelectedRequest(null);
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-500 text-white border-none shadow-lg shadow-red-200";
      case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "blood": return <Droplets className="w-4 h-4 text-red-500" />;
      case "tutor": return <BookOpen className="w-4 h-4 text-blue-500" />;
      case "repair": return <Wrench className="w-4 h-4 text-amber-600" />;
      case "emergency": return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 lg:pb-12">
      <Navbar />

      {/* Stats Strip */}
      <div className="bg-white border-b py-3">
        <div className="container px-6 mx-auto flex flex-wrap justify-center md:justify-start gap-10 text-xs font-bold uppercase tracking-widest text-slate-400">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-slate-900">{allRequests?.length || 0} Open Missions</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-slate-900">1,240 People Helped</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-slate-900">45 Helpers Active</span>
          </div>
        </div>
      </div>

      <header className="bg-white border-b py-10 sticky top-16 z-30 shadow-sm">
        <div className="container px-6 mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-headline font-bold text-slate-900 tracking-tight">Community Feed</h1>
              <p className="text-slate-500 font-medium">Hyperlocal alerts for your neighborhood.</p>
            </div>
            <Link href="/requests/new">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 rounded-full px-8 shadow-xl shadow-primary/20 transition-all hover:scale-105">
                <PlusCircle className="w-5 h-5" /> Quick Post
              </Button>
            </Link>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                placeholder="Search needs, categories, or keywords..." 
                className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] h-14 bg-white rounded-2xl border-slate-200 font-bold text-slate-600">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="blood">🩸 Blood</SelectItem>
                  <SelectItem value="tutor">📚 Tutor</SelectItem>
                  <SelectItem value="repair">🔧 Repair</SelectItem>
                  <SelectItem value="emergency">🚨 Emergency</SelectItem>
                </SelectContent>
              </Select>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[140px] h-14 bg-white rounded-2xl border-slate-200 font-bold text-slate-600">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Urgency</SelectItem>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="normal">🟢 Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto mt-10 flex flex-col lg:grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border space-y-4">
                   <Skeleton className="h-6 w-24 rounded-full" />
                   <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-20 w-full" />
                   <div className="flex justify-between items-center pt-4">
                      <Skeleton className="h-10 w-24 rounded-full" />
                      <Skeleton className="h-10 w-24 rounded-full" />
                   </div>
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center">
              <div className="bg-slate-50 p-8 rounded-full mb-6">
                <Zap className="w-16 h-16 text-slate-200" />
              </div>
              <h2 className="text-3xl font-headline font-bold text-slate-700">Be the First to Help</h2>
              <p className="text-slate-500 mt-2 max-w-sm">No active requests matching your search. Try adjusting your filters or post a new mission.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredRequests.map((request) => (
                <Card 
                  key={request.id} 
                  className={`group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 border-none shadow-sm flex flex-col h-full bg-white rounded-[2rem] cursor-pointer ${request.urgency === 'critical' ? 'animate-pulse-red' : ''}`}
                  onClick={() => setSelectedRequest(request)}
                >
                  <CardHeader className="pb-4 relative z-10">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className={`capitalize font-black tracking-widest text-[10px] px-3 py-1 rounded-full ${getUrgencyStyles(request.urgency)}`}>
                        {request.urgency === 'critical' ? 'CRITICAL' : request.urgency}
                      </Badge>
                      <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-full">
                        {getCategoryIcon(request.category)}
                      </div>
                    </div>
                    <CardTitle className="text-xl font-headline font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {request.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4 relative z-10">
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 font-medium">
                      {request.description}
                    </p>
                    <div className="space-y-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 p-4 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="text-slate-600">{request.location?.area || "Nearby"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>{request.createdAt ? formatDistanceToNow(request.createdAt.toDate()) : "just now"} ago</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 pb-6 px-6 mt-auto flex justify-between items-center relative z-10 border-t border-slate-50 bg-slate-50/20">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 ring-2 ring-white">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.createdBy}`} />
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-black text-slate-700">{request.postedByName || "Member"}</span>
                    </div>
                    <div className="bg-primary/10 p-2 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-all">
                       <ChevronRight className="w-5 h-5" />
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <Card className="rounded-[2rem] border-none shadow-xl bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Heart className="w-32 h-32 text-primary" /></div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> Your Active Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="py-10 text-center border-2 border-dashed border-white/10 rounded-3xl">
                <Zap className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium italic">No active missions accepted.</p>
              </div>
              <Link href="/requests/my" className="block mt-6">
                <Button variant="outline" className="w-full h-12 rounded-2xl font-bold bg-white/5 border-white/10 text-white hover:bg-white/10">
                  View Full History
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> Top Helpers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {topHelpers?.map((helper, idx) => (
                <div key={helper.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-slate-50 shadow-sm transition-transform group-hover:scale-110">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${helper.email}`} />
                        <AvatarFallback>{helper.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-md">
                         <div className="bg-amber-100 text-amber-600 text-[8px] font-black h-5 w-5 flex items-center justify-center rounded-full">#{idx+1}</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{helper.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{helper.totalHelped} Missions Done</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-black text-amber-500 text-xs">
                     <Star className="w-3 h-3 fill-amber-500" />
                     {helper.rating?.toFixed(1) || "5.0"}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </main>

      {/* Request Detail Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          {selectedRequest && (
            <div className="flex flex-col">
              <div className={`h-40 bg-gradient-to-br p-8 flex flex-col justify-end ${selectedRequest.urgency === 'critical' ? 'from-red-500 to-rose-600' : 'from-indigo-500 to-indigo-700'}`}>
                <Badge className="w-fit mb-2 bg-white/20 border-white/30 text-white font-black uppercase tracking-widest text-[10px]">
                  {selectedRequest.category} • {selectedRequest.urgency}
                </Badge>
                <DialogTitle className="text-3xl font-headline font-bold text-white tracking-tight">
                  {selectedRequest.title}
                </DialogTitle>
              </div>
              
              <div className="p-8 space-y-8">
                 <div className="space-y-3">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Detailed Requirement</h4>
                   <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {selectedRequest.description}
                   </p>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Location Details</h4>
                       <div className="bg-slate-50 p-4 rounded-3xl border flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                             <p className="font-bold text-slate-800">{selectedRequest.location?.area}</p>
                             <p className="text-xs text-slate-400 font-medium">GPS Coordinates available on accept</p>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Contact Preference</h4>
                       <div className="bg-slate-50 p-4 rounded-3xl border flex items-start gap-3">
                          {selectedRequest.contactPreference === 'whatsapp' ? <MessageSquare className="w-5 h-5 text-emerald-500" /> : <Phone className="w-5 h-5 text-blue-500" />}
                          <div>
                             <p className="font-bold text-slate-800 capitalize">{selectedRequest.contactPreference}</p>
                             <p className="text-xs text-slate-400 font-medium">Coordinate after matching</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <Avatar className="h-12 w-12 border-2 border-white">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedRequest.createdBy}`} />
                          <AvatarFallback>U</AvatarFallback>
                       </Avatar>
                       <div>
                          <p className="text-sm font-black text-slate-800">{selectedRequest.postedByName}</p>
                          <p className="text-xs font-bold text-slate-400">Community Member Since 2024</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expires In</p>
                       <p className="text-sm font-bold text-indigo-600">
                          {selectedRequest.expiresAt ? formatDistanceToNow(selectedRequest.expiresAt.toDate()) : '...'}
                       </p>
                    </div>
                 </div>
              </div>

              <DialogFooter className="p-8 bg-slate-50 border-t flex gap-4">
                 <Button variant="ghost" className="rounded-2xl h-14 font-bold text-slate-500" onClick={() => setSelectedRequest(null)}>
                    Dismiss
                 </Button>
                 <Button 
                   className="flex-grow h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20"
                   onClick={() => handleAcceptRequest(selectedRequest)}
                 >
                    Accept & Match Now <ArrowRight className="ml-2 w-5 h-5" />
                 </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
