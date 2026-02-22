"use client";

import { useState, useMemo } from "react";
import { collection, query, orderBy, where, doc, Timestamp } from "firebase/firestore";
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
  AlertTriangle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

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

  // Real-time Query for Top Helpers (Leaderboard)
  const leaderboardQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "users"),
      orderBy("totalHelped", "desc"),
      where("totalHelped", ">", 0)
    );
  }, [db]);

  const { data: topHelpers } = useCollection(leaderboardQuery);

  // Priority mapping for sorting: critical (3) > medium (2) > normal (1)
  const urgencyPriority: Record<string, number> = {
    critical: 3,
    medium: 2,
    normal: 1,
  };

  // Filtering and Client-side Sorting (Urgency Priority then Newest)
  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];
    
    return allRequests
      .filter(req => {
        const matchesSearch = 
          req.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          req.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || req.category === categoryFilter;
        const matchesUrgency = urgencyFilter === "all" || req.urgency === urgencyFilter;
        
        // Exclude user's own requests from the general feed if preferred, 
        // but for a community app, usually, you can see all.
        // We also check for expiration
        const now = new Date();
        const expiresAt = req.expiresAt instanceof Timestamp ? req.expiresAt.toDate() : (req.expiresAt ? new Date(req.expiresAt) : null);
        const notExpired = !expiresAt || expiresAt > now;

        return matchesSearch && matchesCategory && matchesUrgency && notExpired;
      })
      .sort((a, b) => {
        // Sort by urgency priority (desc)
        const priorityA = urgencyPriority[a.urgency] || 0;
        const priorityB = urgencyPriority[b.urgency] || 0;
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }
        // Then by timestamp (desc - newest first)
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
  }, [allRequests, searchQuery, categoryFilter, urgencyFilter]);

  const handleAcceptRequest = (requestId: string, createdAt: any) => {
    if (!user || !db) return;

    const requestRef = doc(db, "requests", requestId);
    const now = Timestamp.now();
    
    // Normalize createdAt to a date object
    const createdDate = createdAt instanceof Timestamp 
      ? createdAt.toDate() 
      : (createdAt ? new Date(createdAt) : new Date());
    
    // Calculate response time in minutes
    const diffMs = now.toMillis() - createdDate.getTime();
    const responseTimeMinutes = Math.max(0, Math.floor(diffMs / 60000));

    updateDocumentNonBlocking(requestRef, {
      status: "accepted",
      acceptedBy: user.uid,
      responseTime: responseTimeMinutes,
    });

    toast({
      title: "Request Accepted!",
      description: "You've committed to helping. Contact the requester to coordinate.",
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

      {/* Community Stats Strip */}
      <div className="bg-secondary/5 border-b py-3 overflow-hidden whitespace-nowrap">
        <div className="container px-6 mx-auto flex flex-wrap justify-center md:justify-start gap-8 text-sm font-medium text-secondary">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
            <span>{allRequests?.length || 0} Open Missions Nearby</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>128 Neighbors Helped Recently</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>45 Active Volunteers</span>
          </div>
        </div>
      </div>

      <header className="bg-white border-b py-8 sticky top-16 z-40 shadow-sm">
        <div className="container px-6 mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-headline font-bold text-secondary">Local Help Feed</h1>
              <p className="text-slate-500">Real-time alerts for neighborhood needs</p>
            </div>
            <Link href="/requests/new">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 rounded-full shadow-lg hover:shadow-primary/20 transition-all">
                <PlusCircle className="w-5 h-5" /> Post Help Request
              </Button>
            </Link>
          </div>

          {/* Real-time Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search requests (e.g., 'tutor', 'repair')..." 
                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px] h-12">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="blood">Blood Donation</SelectItem>
                <SelectItem value="tutor">Tutoring</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-full md:w-[150px] h-12">
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
        {/* Real-time Request Feed */}
        <div className="flex-grow space-y-6">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="h-64 animate-pulse bg-slate-100" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-secondary/30 flex flex-col items-center">
              <CheckCircle2 className="w-16 h-16 text-primary mb-4 opacity-20" />
              <h2 className="text-2xl font-headline font-bold text-slate-700">All Quiet in the Neighborhood</h2>
              <p className="text-slate-500 max-w-xs">No active requests matching your filters. Why not post one if you need a hand?</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="group hover:shadow-2xl transition-all border-none shadow-md flex flex-col h-full bg-white relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={`capitalize font-bold border ${getUrgencyStyles(request.urgency)}`}>
                        {request.urgency === 'critical' ? '🔴 ' : request.urgency === 'medium' ? '🟡 ' : '🟢 '}
                        {request.urgency}
                      </Badge>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {getCategoryIcon(request.category)}
                        {request.category}
                      </div>
                    </div>
                    <CardTitle className="text-xl font-headline group-hover:text-secondary transition-colors line-clamp-2 leading-tight">
                      {request.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                      {request.description}
                    </p>
                    <div className="space-y-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
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
                  <CardFooter className="pt-0 pb-6 mt-auto flex justify-between items-center bg-slate-50/50 px-6">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-slate-100">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.createdBy}`} />
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">Requester</span>
                        <span className="text-xs font-bold text-slate-700">{request.postedByName || "Member"}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-accent hover:bg-accent/90 text-white font-bold px-5 rounded-full group/btn shadow-md hover:shadow-accent/20 transition-all"
                      onClick={() => handleAcceptRequest(request.id, request.createdAt)}
                    >
                      Accept &amp; Help
                      <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 space-y-8">
          {/* Quick Stats / Active Items */}
          <Card className="shadow-xl border-t-4 border-t-secondary bg-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 bg-secondary/5">
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <History className="w-5 h-5 text-secondary" /> Active Missions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm pt-4">
              <div className="flex flex-col items-center py-6 text-center">
                <div className="bg-slate-50 p-4 rounded-full mb-3">
                  <CheckCircle2 className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium italic">You haven't accepted any requests yet.</p>
              </div>
              <Link href="/requests/my">
                <Button variant="outline" size="sm" className="w-full border-secondary text-secondary hover:bg-secondary/10 font-bold rounded-xl transition-all">
                  View My Request History
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Leaderboard Card */}
          <Card className="shadow-xl border-t-4 border-t-primary bg-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 bg-primary/5">
              <div className="flex justify-between items-end">
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" /> Top Helpers
                </CardTitle>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pb-1">This Week</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-5">
                {topHelpers?.slice(0, 5).map((helper, idx) => (
                  <div key={helper.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-11 w-11 border-2 border-white shadow-md group-hover:scale-110 transition-transform ring-1 ring-slate-100">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${helper.email}`} />
                          <AvatarFallback>{helper.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 shadow-lg border-2 border-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-orange-400' : 'bg-secondary'}`}>
                          <div className="w-4 h-4 flex items-center justify-center text-[8px] font-black text-white">
                            {idx + 1}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 tracking-tight">{helper.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verified Hero</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary font-black px-2 py-0.5 rounded-lg border-none">
                      {helper.totalHelped} pts
                    </Badge>
                  </div>
                ))}
                {!topHelpers || topHelpers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Waiting for community action...</p>
                ) : null}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button variant="ghost" size="sm" className="w-full text-xs font-bold text-slate-400 hover:text-secondary hover:bg-transparent transition-colors">
                View Full Community Leaderboard
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </main>
    </div>
  );
}
