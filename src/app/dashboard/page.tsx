"use client";

import { useState } from "react";
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
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowRight, 
  Users, 
  Flame, 
  Trophy,
  Droplets,
  BookOpen,
  Wrench,
  AlertCircle
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

  // Fetching all requests
  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      orderBy("urgency", "desc"),
      orderBy("timestamp", "desc")
    );
  }, [db]);

  const { data: allRequests, isLoading } = useCollection(requestsQuery);

  // Fetching Top Helpers (Leaderboard)
  const leaderboardQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "users"),
      orderBy("totalHelped", "desc"),
      where("totalHelped", ">", 0)
    );
  }, [db]);

  const { data: topHelpers } = useCollection(leaderboardQuery);

  // Filtering Logic
  const filteredRequests = allRequests?.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         req.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || req.category === categoryFilter;
    const matchesUrgency = urgencyFilter === "all" || req.urgency === urgencyFilter;
    
    // Only show non-expired requests
    const now = new Date();
    const expiresAt = req.expiresAt instanceof Timestamp ? req.expiresAt.toDate() : req.expiresAt;
    const notExpired = !expiresAt || new Date(expiresAt) > now;

    return matchesSearch && matchesCategory && matchesUrgency && notExpired;
  });

  const handleAcceptRequest = (requestId: string, createdAt: any) => {
    if (!user || !db) return;

    const requestRef = doc(db, "requests", requestId);
    const now = Timestamp.now();
    const createdDate = createdAt instanceof Timestamp ? createdAt : Timestamp.fromDate(new Date(createdAt));
    
    // Calculate response time in minutes
    const diffMs = now.toMillis() - createdDate.toMillis();
    const responseTimeMinutes = Math.floor(diffMs / 60000);

    updateDocumentNonBlocking(requestRef, {
      status: "accepted",
      acceptedBy: user.uid,
      responseTime: responseTimeMinutes,
      acceptedAt: now
    });

    toast({
      title: "Request Accepted!",
      description: "You've committed to helping. Check 'My Requests' for details.",
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

      {/* Stats Strip */}
      <div className="bg-secondary/10 border-b py-3">
        <div className="container px-6 mx-auto flex flex-wrap justify-center md:justify-start gap-8 text-sm font-medium text-secondary">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>{allRequests?.length || 0} Open Requests Near You</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>128 People Helped This Week</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>45 Active Volunteers</span>
          </div>
        </div>
      </div>

      <header className="bg-white border-b py-8 sticky top-16 z-40">
        <div className="container px-6 mx-auto space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-headline font-bold text-secondary">Community Feed</h1>
              <p className="text-slate-500">Find neighbors who need a hand right now</p>
            </div>
            <Link href="/requests/new">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold gap-2">
                <PlusCircle className="w-5 h-5" /> Post Help Request
              </Button>
            </Link>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by keywords..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
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
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto mt-8 flex flex-col lg:flex-row gap-8">
        {/* Main Feed */}
        <div className="flex-grow space-y-6">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="h-64 animate-pulse bg-slate-100" />
              ))}
            </div>
          ) : !filteredRequests || filteredRequests.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-secondary/30">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-headline font-bold text-slate-700">All caught up!</h2>
              <p className="text-slate-500">No active requests matching your filters.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="group hover:shadow-xl transition-all border-l-4 border-l-primary flex flex-col h-full bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={`capitalize ${getUrgencyStyles(request.urgency)}`}>
                        {request.urgency === 'critical' ? '🔴 ' : request.urgency === 'medium' ? '🟡 ' : '🟢 '}
                        {request.urgency}
                      </Badge>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        {getCategoryIcon(request.category)}
                        {request.category}
                      </div>
                    </div>
                    <CardTitle className="text-xl font-headline group-hover:text-secondary transition-colors line-clamp-2">
                      {request.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <p className="text-slate-600 text-sm line-clamp-3">
                      {request.description}
                    </p>
                    <div className="space-y-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-secondary" />
                        <span className="font-medium">{request.location?.area || "Local Area"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-secondary" />
                        <span>Posted {request.timestamp ? formatDistanceToNow(request.timestamp.toDate()) : "just now"} ago</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-6 mt-auto flex justify-between items-center bg-slate-50/30">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.createdBy}`} />
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Posted By</span>
                        <span className="text-xs font-semibold text-slate-700">{request.postedByName || "Anonymous"}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-accent hover:bg-accent/90 text-white font-bold px-6 rounded-full group/btn"
                      onClick={() => handleAcceptRequest(request.id, request.timestamp)}
                    >
                      Accept & Help
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
          {/* Active Requests Card */}
          <Card className="shadow-lg border-t-4 border-t-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <History className="w-5 h-5 text-secondary" /> My Active Items
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-slate-500 mb-4 italic">You have no active help missions currently.</p>
              <Link href="/requests/my">
                <Button variant="outline" size="sm" className="w-full border-secondary text-secondary hover:bg-secondary/10">
                  View Full History
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="shadow-lg border-t-4 border-t-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" /> Top Helpers
              </CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">This Week</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topHelpers?.slice(0, 5).map((helper, idx) => (
                  <div key={helper.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${helper.email}`} />
                          <AvatarFallback>{helper.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-400' : 'bg-secondary'}`}>
                            {idx + 1}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{helper.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Verified Volunteer</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
                      {helper.totalHelped} pts
                    </Badge>
                  </div>
                ))}
                {!topHelpers || topHelpers.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No data yet</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-secondary">
                View All Community Leaders
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </main>
    </div>
  );
}
