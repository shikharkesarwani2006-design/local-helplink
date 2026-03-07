"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  collection, 
  query, 
  orderBy, 
  where, 
  doc, 
  Timestamp,
} from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Search, 
  Users, 
  Droplets,
  BookOpen,
  Wrench,
  AlertTriangle,
  Zap,
  ChevronRight,
  Filter,
  Navigation,
  LayoutGrid,
  Map as MapIcon,
  Sparkles,
  Plus,
  ArrowRight,
  Trophy
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sendNotification } from "@/firebase/notifications";
import { cn, calculateDistance } from "@/lib/utils";
import { summarizeHelpRequest } from "@/ai/flows/summarize-help-request";
import Link from "next/link";

// Dynamically import MapDashboard to avoid 'window is not defined' error
const MapDashboard = dynamic(() => import("@/components/dashboard/MapDashboard"), { 
  ssr: false,
  loading: () => <Skeleton className="h-[600px] w-full rounded-3xl" />
});

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showOnlyNearby, setShowOnlyNearby] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  
  // Counters for visual flair
  const [counters, setCounters] = useState({ open: 0, helpers: 0, impact: 0 });

  useEffect(() => {
    setMounted(true);
    if ("geolocation" in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
          setShowOnlyNearby(false);
        }
      );
    }
  }, []);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);

  const { data: allRequests, isLoading: isRequestsLoading } = useCollection(requestsQuery);

  // Animated counters logic
  useEffect(() => {
    if (allRequests && mounted) {
      const targetOpen = allRequests.length;
      const targetHelpers = 842; 
      const targetImpact = 124; 

      const interval = setInterval(() => {
        setCounters(prev => ({
          open: prev.open < targetOpen ? prev.open + 1 : targetOpen,
          helpers: prev.helpers < targetHelpers ? prev.helpers + 12 : targetHelpers,
          impact: prev.impact < targetImpact ? prev.impact + 3 : targetImpact,
        }));
      }, 30);
      return () => clearInterval(interval);
    }
  }, [allRequests, mounted]);

  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];
    
    let processed = allRequests.map(req => {
      let distance = null;
      if (userLocation && req.location?.lat && req.location?.lng) {
        distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          req.location.lat,
          req.location.lng
        );
      }
      return { ...req, distance };
    });

    return processed
      .filter(req => {
        const matchesSearch = 
          req.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          req.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || req.category === categoryFilter;
        const matchesNearby = !showOnlyNearby || !userLocation || (req.distance !== null && req.distance <= 5);
        const isNotMine = req.createdBy !== user?.uid;
        
        return matchesSearch && matchesCategory && matchesNearby && isNotMine;
      })
      .sort((a, b) => {
        if (showOnlyNearby && a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        return 0;
      });
  }, [allRequests, searchQuery, categoryFilter, userLocation, showOnlyNearby, user?.uid]);

  const handleGenerateSummary = async (request: any) => {
    if (summaries[request.id]) return;
    setIsSummarizing(request.id);
    try {
      const result = await summarizeHelpRequest({ description: request.description });
      setSummaries(prev => ({ ...prev, [request.id]: result.summary }));
    } catch (error) {
      console.error("AI Summary failed:", error);
    } finally {
      setIsSummarizing(null);
    }
  };

  const handleAcceptRequest = async (request: any) => {
    if (!user || !db) return;
    
    if (request.createdBy === user.uid) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You cannot accept your own mission.",
      });
      return;
    }

    const requestRef = doc(db, "requests", request.id);
    const now = Timestamp.now();
    const createdDate = request.createdAt instanceof Timestamp ? request.createdAt.toDate() : new Date();
    const responseTimeMinutes = Math.max(0, Math.floor((now.toMillis() - createdDate.getTime()) / 60000));

    updateDocumentNonBlocking(requestRef, {
      status: "accepted",
      acceptedBy: user.uid,
      responseTime: responseTimeMinutes,
    });

    sendNotification(db, request.createdBy, {
      title: "Mission Accepted!",
      message: `${user.displayName || "A neighbor"} has accepted your mission: "${request.title}"`,
      type: "accepted",
      link: `/requests/my`
    });

    toast({
      title: "Mission Claimed!",
      description: "You've successfully accepted this call. Check your notifications to coordinate!",
    });
    setSelectedRequest(null);
  };

  const categories = [
    { id: "all", label: "All", icon: Filter },
    { id: "blood", label: "Blood", icon: Droplets, color: "text-red-500" },
    { id: "tutor", label: "Tutor", icon: BookOpen, color: "text-blue-500" },
    { id: "repair", label: "Repair", icon: Wrench, color: "text-amber-500" },
    { id: "emergency", label: "Emergency", icon: AlertTriangle, color: "text-rose-500" },
  ];

  const isLoading = isUserLoading || isRequestsLoading;

  if (!mounted) {
    return <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950" />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20">
      {/* 🚀 Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary pt-12 pb-24 md:pt-16 md:pb-32 px-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="container mx-auto relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400" /> Hyperlocal Mission Control
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-4xl md:text-6xl font-headline font-bold text-white tracking-tight leading-tight">
              Help Someone <span className="text-amber-400">Nearby</span> Today
            </h1>
            <p className="text-lg md:text-xl text-indigo-100 max-w-2xl mx-auto leading-relaxed">
              Real-time support network for emergency assistance and skill exchange. Your campus, connected through kindness.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href="/requests/new">
              <Button size="lg" className="h-16 px-10 text-xl bg-white text-primary hover:bg-indigo-50 font-bold rounded-full shadow-2xl transition-all active:scale-95 group">
                Post a Need <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/profile">
              <Button size="lg" variant="outline" className="h-16 px-10 text-xl border-white/30 text-white hover:bg-white/10 font-bold rounded-full backdrop-blur-sm">
                Become a Helper
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="container px-4 sm:px-6 mx-auto -mt-16 space-y-12">
        {/* 🔥 Live Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <CardContent className="pt-8 pb-8 flex items-center gap-6 px-8">
              <div className="bg-primary/10 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Missions Open</p>
                <h3 className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{counters.open}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <CardContent className="pt-8 pb-8 flex items-center gap-6 px-8">
              <div className="bg-emerald-100 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Helpers</p>
                <h3 className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{counters.helpers}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <CardContent className="pt-8 pb-8 flex items-center gap-6 px-8">
              <div className="bg-amber-100 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Weekly Impact</p>
                <h3 className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{counters.impact}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🛠 Filters & Search */}
        <div className="space-y-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1.5 flex shadow-sm">
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold transition-all",
                    viewMode === "list" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" /> List View
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold transition-all",
                    viewMode === "map" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <MapIcon className="w-4 h-4" /> Live Map
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-5 font-bold h-11 border transition-all text-sm",
                      categoryFilter === cat.id 
                        ? "bg-slate-900 text-white shadow-xl border-slate-900" 
                        : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    <cat.icon className={cn("w-4 h-4", categoryFilter === cat.id ? "text-white" : cat.color)} />
                    {cat.label}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowOnlyNearby(!showOnlyNearby)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 font-bold h-11 border transition-all text-sm",
                  showOnlyNearby 
                    ? "bg-indigo-50 text-primary border-primary/20 shadow-inner" 
                    : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800"
                )}
              >
                <MapPin className="w-4 h-4" />
                Nearby (5km)
              </button>
            </div>
            
            <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search missions..." 
                className="pl-11 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-primary/20 shadow-sm text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-72 w-full rounded-[2.5rem]" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-32 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-12 rounded-[3rem] mb-8 relative">
                <div className="absolute inset-0 bg-primary/10 rounded-[3rem] animate-ping opacity-20" />
                <Zap className="w-20 h-20 text-primary relative z-10" />
              </div>
              <h3 className="text-3xl font-headline font-bold text-slate-900 dark:text-white">All Clear!</h3>
              <p className="text-slate-500 mt-3 max-w-sm text-lg leading-relaxed">
                There are no open missions in this area right now. Why not be the first to start a movement?
              </p>
              <Link href="/requests/new" className="mt-8">
                <Button size="lg" className="rounded-full font-bold h-14 px-8 shadow-xl shadow-primary/20">
                  Post a Help Request
                </Button>
              </Link>
            </div>
          ) : viewMode === "map" ? (
            <MapDashboard 
              requests={filteredRequests} 
              userLocation={userLocation} 
              onAccept={handleAcceptRequest} 
            />
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredRequests.map((request) => (
                <Card 
                  key={request.id} 
                  className={cn(
                    "group relative overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border-none flex flex-col h-full cursor-pointer",
                    request.urgency === 'high' && "ring-2 ring-red-500/20"
                  )}
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-2 transition-all group-hover:w-3",
                    request.urgency === 'high' ? 'bg-red-500' : request.urgency === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />

                  <CardHeader className="pb-4 pl-8 pr-6 pt-8">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-2 rounded-xl bg-slate-50 dark:bg-slate-800",
                          categories.find(c => c.id === request.category)?.color
                        )}>
                          {(() => {
                            const CatIcon = categories.find(c => c.id === request.category)?.icon || Filter;
                            return <CatIcon className="w-4 h-4" />;
                          })()}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {request.category}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                        <Clock className="w-3 h-3" /> {request.createdAt ? formatDistanceToNow(request.createdAt.toDate()) : "just now"}
                      </span>
                    </div>
                    <CardTitle className="text-xl font-headline font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">
                      {request.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-5 pl-8 pr-6">
                    {summaries[request.id] ? (
                      <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-3xl border border-primary/10 animate-in slide-in-from-left-2 duration-300">
                        <p className="text-[10px] font-black text-primary flex items-center gap-2 mb-2 uppercase tracking-widest">
                          <Sparkles className="w-3 h-3" /> AI Summary
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed italic">
                          "{summaries[request.id]}"
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed">
                        {request.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {request.location?.area || "Campus Area"}
                      </div>
                      {request.distance !== null && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-secondary dark:text-indigo-400 bg-secondary/10 px-3 py-1.5 rounded-full uppercase">
                          <Navigation className="w-3.5 h-3.5" />
                          {request.distance.toFixed(1)} km
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-6 pb-8 pl-8 pr-6 flex justify-between items-center mt-auto border-t border-slate-50 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-slate-800">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${request.createdBy}`} />
                          <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-300">{request.postedByName || "Member"}</span>
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Verified</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       {!summaries[request.id] && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateSummary(request);
                          }}
                          disabled={isSummarizing === request.id}
                        >
                          {isSummarizing === request.id ? (
                            <Sparkles className="w-4 h-4 animate-pulse" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </Button>
                       )}
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold h-10 px-6 shadow-lg shadow-primary/10 transition-transform active:scale-95"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptRequest(request);
                        }}
                      >
                        Accept
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 📍 Floating Post Button */}
      <Link href="/requests/new" className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-[60] group">
        <Button className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-primary hover:bg-primary/90 text-white shadow-[0_15px_30px_rgba(99,102,241,0.4)] transition-all group-hover:scale-110 p-0">
          <Plus className="w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:rotate-90" />
        </Button>
      </Link>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl dark:bg-slate-900">
          {selectedRequest && (
            <div className="flex flex-col">
              <div className={cn(
                "p-10 text-white relative", 
                selectedRequest.urgency === 'high' ? 'bg-red-500' : 'bg-primary'
              )}>
                <div className="absolute top-0 right-0 p-10 opacity-10">
                  <Zap className="w-32 h-32" />
                </div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <Badge className="bg-white/20 border-white/30 text-white font-bold uppercase text-[10px] px-3 py-1 backdrop-blur-md">
                    {selectedRequest.category}
                  </Badge>
                  <Badge className="bg-white/20 border-white/30 text-white font-bold uppercase text-[10px] px-3 py-1 backdrop-blur-md">
                    {selectedRequest.urgency} Urgency
                  </Badge>
                </div>
                <DialogTitle className="text-3xl font-headline font-bold mb-3 relative z-10">
                  {selectedRequest.title}
                </DialogTitle>
                <p className="text-white/80 text-base font-medium relative z-10 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Posted {formatDistanceToNow(selectedRequest.createdAt.toDate())} ago
                </p>
              </div>
              
              <div className="p-10 space-y-8 bg-white dark:bg-slate-900">
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Mission Objective</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedRequest.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location Hub</p>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-xl">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-base font-bold text-slate-900 dark:text-slate-200 capitalize">
                        {selectedRequest.location?.area || "Main Campus"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Expiry Window</p>
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-100 p-2 rounded-xl">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <p className="text-base font-bold text-slate-900 dark:text-slate-200">
                        {selectedRequest.expiresAt ? formatDistanceToNow(selectedRequest.expiresAt.toDate()) : 'Indefinite'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-6 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-[2rem] border border-indigo-100/50">
                  <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedRequest.createdBy}`} />
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{selectedRequest.postedByName}</p>
                    <p className="text-xs text-slate-500">Contact Method: {selectedRequest.contactPreference || "In-App"}</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-8 bg-slate-50 dark:bg-slate-950/50 border-t dark:border-slate-800 flex flex-row gap-4">
                <Button variant="ghost" className="font-bold text-slate-500 flex-1 h-14 rounded-2xl" onClick={() => setSelectedRequest(null)}>
                  Keep Browsing
                </Button>
                <Button 
                  className="flex-1 bg-primary text-white font-bold h-14 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
                  onClick={() => handleAcceptRequest(selectedRequest)}
                >
                  Confirm Mission
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}