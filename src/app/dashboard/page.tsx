
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  collection, 
  query, 
  orderBy, 
  where, 
  doc, 
  Timestamp,
} from "firebase/firestore";
import { 
  useFirestore, 
  useUser, 
  useCollection, 
  useDoc,
  useMemoFirebase, 
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  Plus,
  PlusCircle,
  ArrowRight,
  Trophy,
  Loader2,
  XCircle,
  Star,
  Heart,
  LayoutGrid,
  Filter
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Helper component to display name and rating of the person who accepted a request.
 */
function HelperInfo({ helperId }: { helperId: string }) {
  const db = useFirestore();
  const helperRef = useMemoFirebase(() => (db ? doc(db, "users", helperId) : null), [db, helperId]);
  const { data: helper } = useDoc(helperRef);

  if (!helper) return <span className="text-xs text-slate-400">Loading helper info...</span>;

  return (
    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
      <Avatar className="h-5 w-5">
        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${helper.email}`} />
        <AvatarFallback>{helper.name?.[0]}</AvatarFallback>
      </Avatar>
      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
        {helper.name} ({helper.rating?.toFixed(1) || "5.0"} ⭐)
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { user, isUserLoading, authInitialized } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // 1. Fetch User Profile for Stats & Welcome
  const profileRef = useMemoFirebase(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch My Active Requests (My Broadcasts)
  const myRequestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "requests"),
      where("createdBy", "==", user.uid),
      where("status", "in", ["open", "accepted"]),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);
  const { data: myRequests, isLoading: isMyRequestsLoading } = useCollection(myRequestsQuery, { 
    enabled: !!user && authInitialized 
  });

  // 3. Fetch Nearby Requests Feed (From Others)
  const nearbyQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);
  const { data: nearbyRequests, isLoading: isNearbyLoading } = useCollection(nearbyQuery, { 
    enabled: !!user && authInitialized 
  });

  const filteredNearby = useMemo(() => {
    if (!nearbyRequests) return [];
    return nearbyRequests.filter(req => {
      const isNotMine = req.createdBy !== user?.uid;
      const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           req.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || req.category === categoryFilter;
      return isNotMine && matchesSearch && matchesCategory;
    });
  }, [nearbyRequests, searchQuery, categoryFilter, user?.uid]);

  const handleCancelRequest = (requestId: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, "requests", requestId));
    toast({ title: "Request Cancelled", description: "Your mission has been removed from the feed." });
  };

  const handleCompleteRequest = (requestId: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "requests", requestId), { status: "completed" });
    toast({ title: "Mission Completed!", description: "Thank you for strengthening our community!" });
  };

  const handleOfferHelp = (request: any) => {
    if (!db || !user) return;
    updateDocumentNonBlocking(doc(db, "requests", request.id), {
      status: "accepted",
      acceptedBy: user.uid,
    });
    toast({ title: "Help Offered!", description: "You've accepted this mission. Check your notifications to coordinate!" });
  };

  const categories = [
    { id: "all", label: "All", icon: Filter },
    { id: "blood", label: "Blood", icon: Droplets, color: "text-red-500" },
    { id: "tutor", label: "Tutor", icon: BookOpen, color: "text-blue-500" },
    { id: "repair", label: "Repair", icon: Wrench, color: "text-amber-500" },
    { id: "emergency", label: "Emergency", icon: AlertTriangle, color: "text-rose-500" },
  ];

  if (isUserLoading || !authInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20">
      {/* 🚀 1. Welcome Banner */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-secondary pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="container mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-3 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-headline font-bold text-white tracking-tight">
              Hello, {profile?.name || "Neighbor"} 👋
            </h1>
            <p className="text-indigo-100 font-medium">
              You have <span className="text-white font-bold">{myRequests?.length || 0} active requests</span> in the network.
            </p>
          </div>
          <Link href="/requests/new">
            <Button size="lg" className="h-16 px-8 bg-white text-primary hover:bg-indigo-50 font-bold rounded-full shadow-2xl transition-all active:scale-95">
              Need Help? Post Now <Plus className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <main className="container px-4 sm:px-6 mx-auto -mt-12 relative z-20 space-y-12">
        {/* 📊 4. Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden group">
            <CardContent className="pt-8 pb-8 flex items-center gap-6 px-8">
              <div className="bg-primary/10 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Requests Posted</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {profile?.totalRatingsCount || 0}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden group">
            <CardContent className="pt-8 pb-8 flex items-center gap-6 px-8">
              <div className="bg-emerald-100 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Missions Succeeded</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {profile?.totalHelped || 0}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden group">
            <CardContent className="pt-8 pb-8 flex items-center gap-6 px-8">
              <div className="bg-amber-100 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <Star className="w-8 h-8 text-amber-600 fill-amber-600" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Neighbor Rating</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {profile?.rating?.toFixed(1) || "5.0"}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🛠 2. My Active Requests */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <PlusCircle className="w-6 h-6 text-primary" /> My Active Broadcasts
            </h2>
            <Link href="/requests/my" className="text-sm font-bold text-primary hover:underline">View All History</Link>
          </div>
          
          {isMyRequestsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
            </div>
          ) : myRequests?.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 font-medium">You have no active requests right now.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRequests?.map((req) => (
                <Card key={req.id} className="rounded-3xl border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden flex flex-col group">
                  <div className={cn(
                    "h-2 w-full",
                    req.status === 'open' ? 'bg-blue-500' : 'bg-amber-500'
                  )} />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <Badge className={cn(
                        "capitalize px-3 py-1 text-[10px] font-black rounded-full",
                        req.status === 'open' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {req.status}
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {formatDistanceToNow(req.createdAt.toDate())} ago
                      </span>
                    </div>
                    <CardTitle className="text-lg font-headline font-bold mt-3 leading-tight">{req.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{req.description}</p>
                    {req.status === 'accepted' && req.acceptedBy && (
                      <HelperInfo helperId={req.acceptedBy} />
                    )}
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-slate-50 dark:border-slate-800 flex gap-2">
                    {req.status === 'open' ? (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 font-bold"
                        onClick={() => handleCancelRequest(req.id)}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Cancel
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/10"
                        onClick={() => handleCompleteRequest(req.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Complete
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 🌎 3. Nearby Requests Feed */}
        <section className="space-y-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <LayoutGrid className="w-6 h-6 text-indigo-500" /> Neighborhood Missions
            </h2>
            
            <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-5 font-bold h-10 border transition-all text-xs",
                      categoryFilter === cat.id 
                        ? "bg-slate-900 text-white shadow-xl border-slate-900" 
                        : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    <cat.icon className={cn("w-3.5 h-3.5", categoryFilter === cat.id ? "text-white" : cat.color)} />
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-64 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search missions..." 
                  className="pl-11 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-full focus:ring-primary/20 shadow-sm text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {isNearbyLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}
            </div>
          ) : filteredNearby.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-10 rounded-full mb-6">
                <Filter className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold">No Missions Found</h3>
              <p className="text-slate-500 mt-2 max-w-xs text-sm">
                Adjust your filters or be the first to post a new request!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredNearby.map((request) => (
                <Card 
                  key={request.id} 
                  className={cn(
                    "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white dark:bg-slate-900 rounded-[2rem] border-none flex flex-col h-full",
                    request.urgency === 'high' && "ring-2 ring-red-500/20"
                  )}
                >
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    request.urgency === 'high' ? 'bg-red-500' : request.urgency === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />

                  <CardHeader className="pb-2 pl-8 pr-6 pt-8">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800",
                          categories.find(c => c.id === request.category)?.color
                        )}>
                          {(() => {
                            const CatIcon = categories.find(c => c.id === request.category)?.icon || Filter;
                            return <CatIcon className="w-3.5 h-3.5" />;
                          })()}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {request.category}
                        </span>
                      </div>
                      <Badge className={cn(
                        "text-[9px] font-black uppercase tracking-widest rounded-full",
                        request.urgency === 'high' ? "bg-red-50 text-red-600 border-red-100" :
                        request.urgency === 'medium' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )} variant="outline">
                        {request.urgency}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-headline font-bold text-slate-900 dark:text-white leading-tight">
                      {request.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4 pl-8 pr-6">
                    <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">
                      {request.description}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 dark:border-slate-800 pt-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {request.location?.area || "Campus"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDistanceToNow(request.createdAt.toDate())} ago
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 pb-8 pl-8 pr-6">
                    <Button 
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold h-11 transition-all group-hover:scale-[1.02]"
                      onClick={() => handleOfferHelp(request)}
                    >
                      Offer Help <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 📍 Floating Post Button */}
      <Link href="/requests/new" className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-[60] group">
        <Button className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-primary hover:bg-primary/90 text-white shadow-[0_15px_30px_rgba(99,102,241,0.4)] transition-all group-hover:scale-110 p-0">
          <Plus className="w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:rotate-90" />
        </Button>
      </Link>
    </div>
  );
}
