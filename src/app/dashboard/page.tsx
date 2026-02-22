
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
  Zap
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

  // 1. AUTO-EXPIRE CLEANUP LOGIC
  useEffect(() => {
    if (!db) return;

    const cleanupExpiredRequests = async () => {
      const now = Timestamp.now();
      const q = query(
        collection(db, "requests"),
        where("status", "==", "open"),
        where("expiresAt", "<", now),
        limit(50)
      );

      try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => {
          batch.update(d.ref, { status: "expired" });
          // Notify creator about expiration
          const data = d.data();
          sendNotification(db, data.createdBy, {
            title: "Request Expired",
            message: `Your request "${data.title}" has expired.`,
            type: "system",
            link: "/requests/my"
          });
        });

        await batch.commit();
        console.log(`Auto-expired ${snapshot.size} requests.`);
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    };

    cleanupExpiredRequests();
  }, [db]);

  // Real-time Query for Open Requests
  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
  }, [db]);

  const { data: allRequests, isLoading } = useCollection(requestsQuery);

  // Real-time Query for Top Helpers
  const leaderboardQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "users"),
      orderBy("totalHelped", "desc"),
      where("totalHelped", ">", 0),
      limit(5)
    );
  }, [db]);

  const { data: topHelpers } = useCollection(leaderboardQuery);

  const urgencyPriority: Record<string, number> = {
    critical: 3,
    medium: 2,
    normal: 1,
  };

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
    const diffMs = now.toMillis() - createdDate.getTime();
    const responseTimeMinutes = Math.max(0, Math.floor(diffMs / 60000));

    // Update status and response time
    updateDocumentNonBlocking(requestRef, {
      status: "accepted",
      acceptedBy: user.uid,
      responseTime: responseTimeMinutes,
    });

    // Notify the requester
    sendNotification(db, request.createdBy, {
      title: "Request Accepted!",
      message: `${user.displayName || "A neighbor"} has accepted your request: "${request.title}".`,
      type: "accepted",
      link: `/requests/my`
    });

    toast({
      title: "Request Accepted!",
      description: "You've committed to helping. Coordinate with the requester.",
    });
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-100 text-red-700 border-red-200";
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
    <div className="min-h-screen bg-background pb-12">
      <Navbar />

      <div className="bg-white border-b py-3 overflow-hidden">
        <div className="container px-6 mx-auto flex flex-wrap justify-center md:justify-start gap-8 text-sm font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
            <span>{allRequests?.length || 0} Open Requests Near You</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>128 People Helped This Week</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-secondary" />
            <span>45 Volunteers Active Now</span>
          </div>
        </div>
      </div>

      <header className="bg-slate-50 border-b py-8 sticky top-16 z-40 shadow-sm">
        <div className="container px-6 mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-headline font-bold text-secondary">Community Feed</h1>
              <p className="text-slate-500">Real-time alerts for local needs</p>
            </div>
            <Link href="/requests/new">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 rounded-full shadow-lg">
                <PlusCircle className="w-5 h-5" /> Quick Post
              </Button>
            </Link>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search requests..." 
                className="pl-10 h-12 bg-white border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px] h-12 bg-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="blood">Blood Donation</SelectItem>
                <SelectItem value="tutor">Tutoring</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-full md:w-[150px] h-12 bg-white">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Urgency</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
                <SelectItem value="medium">Medium Only</SelectItem>
                <SelectItem value="normal">Normal Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto mt-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-grow space-y-6">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="h-64 animate-pulse bg-slate-100" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed flex flex-col items-center">
              <Zap className="w-16 h-16 text-slate-200 mb-4" />
              <h2 className="text-2xl font-headline font-bold text-slate-700">All Quiet Nearby</h2>
              <p className="text-slate-500">No active requests matching your filters.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-xl transition-all border-none shadow-md flex flex-col h-full bg-white relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${request.urgency === 'critical' ? 'bg-red-500' : request.urgency === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={`capitalize font-bold ${getUrgencyStyles(request.urgency)}`}>
                        {request.urgency === 'critical' ? '🔴 ' : request.urgency === 'medium' ? '🟡 ' : '🟢 '}
                        {request.urgency}
                      </Badge>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {getCategoryIcon(request.category)}
                        {request.category}
                      </div>
                    </div>
                    <CardTitle className="text-xl font-headline group-hover:text-secondary transition-colors line-clamp-2">
                      {request.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                      {request.description}
                    </p>
                    <div className="space-y-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-secondary" />
                        <span className="font-semibold text-slate-700">{request.location?.area || "Hyperlocal"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-secondary" />
                        <span>Posted {request.createdAt ? formatDistanceToNow(request.createdAt instanceof Timestamp ? request.createdAt.toDate() : new Date(request.createdAt)) : "just now"} ago</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-6 mt-auto flex justify-between items-center bg-slate-50/30 px-6 rounded-b-lg">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.createdBy}`} />
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-slate-700">{request.postedByName || "Member"}</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-accent hover:bg-accent/90 text-white font-bold rounded-full shadow-md"
                      onClick={() => handleAcceptRequest(request)}
                    >
                      Accept & Help
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        <aside className="w-full lg:w-80 space-y-8">
          <Card className="shadow-lg border-t-4 border-t-secondary bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <History className="w-5 h-5 text-secondary" /> My Active Missions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-slate-500 text-center py-4 italic">No active missions accepted.</p>
              <Link href="/requests/my">
                <Button variant="outline" size="sm" className="w-full mt-2 font-bold">History</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-t-4 border-t-primary bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" /> Top Helpers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topHelpers?.map((helper) => (
                  <div key={helper.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${helper.email}`} />
                        <AvatarFallback>{helper.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-bold text-slate-700">{helper.name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {helper.totalHelped}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
