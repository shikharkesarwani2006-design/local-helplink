
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  collection, 
  query, 
  where, 
  doc,
  increment,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";
import { 
  useFirestore, 
  useCollection, 
  useDoc,
  useMemoFirebase, 
  deleteDocumentNonBlocking
} from "@/firebase";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Search, 
  Zap, 
  Plus, 
  PlusCircle, 
  ArrowRight, 
  Star, 
  Heart, 
  LayoutGrid, 
  Filter, 
  Droplets, 
  BookOpen, 
  Wrench, 
  AlertTriangle, 
  XCircle,
  Loader2,
  Phone,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { User } from "firebase/auth";
import { sendNotification } from "@/firebase/notifications";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";
import { RatingModal } from "@/components/profile/RatingModal";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { ChatModal } from "@/components/chat/ChatModal";
import { closeChat } from "@/firebase/chat";

function HelperContactBox({ helperId, onChat }: { helperId: string, onChat: () => void }) {
  const db = useFirestore();
  const helperRef = useMemoFirebase(() => (db && helperId ? doc(db, "users", helperId) : null), [db, helperId]);
  const { data: helper } = useDoc(helperRef);

  if (!helperId || !helper) return <Skeleton className="h-16 w-full rounded-xl" />;

  return (
    <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${helper.email}`} />
            <AvatarFallback>{helper.name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none mb-1">Help is coming from</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{helper.name}</p>
          </div>
        </div>
        {helper.phone && (
          <Button size="sm" variant="outline" className="rounded-full bg-white dark:bg-slate-900 border-emerald-200 text-emerald-600 gap-2 h-9" asChild>
            <a href={`tel:${helper.phone}`}>
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          </Button>
        )}
      </div>
      <Button className="w-full bg-primary text-white font-bold h-10 rounded-xl gap-2 shadow-lg shadow-primary/20" onClick={onChat}>
        <MessageSquare className="w-4 h-4" /> Chat with Helper
      </Button>
    </div>
  );
}

export function UserDashboardView({ profile, user }: { profile: any; user: User }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [showRatingFor, setShowRatingFor] = useState<{ id: string, helperId: string } | null>(null);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);

  const myRequestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "requests"), where("createdBy", "==", user.uid));
  }, [db, user?.uid]);
  const { data: rawMyRequests, isLoading: isMyRequestsLoading } = useCollection(myRequestsQuery);

  const myActiveRequests = useMemo(() => {
    if (!rawMyRequests) return [];
    return [...rawMyRequests]
      .filter(req => req.status === 'open' || req.status === 'accepted')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawMyRequests]);

  const stats = useMemo(() => {
    const posted = rawMyRequests?.length || 0;
    const succeeded = rawMyRequests?.filter(req => req.status === 'completed').length || 0;
    const ratingVal = profile?.rating;
    const rating = ratingVal && ratingVal > 0 ? ratingVal.toFixed(1) : "New";
    
    return { posted, succeeded, rating };
  }, [rawMyRequests, profile?.rating]);

  const nearbyQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "requests"), where("status", "==", "open"));
  }, [db]);
  const { data: rawNearby, isLoading: isNearbyLoading } = useCollection(nearbyQuery);

  const filteredNearby = useMemo(() => {
    if (!rawNearby) return [];
    return [...rawNearby]
      .filter(req => {
        const isNotMine = req.createdBy !== user?.uid;
        const title = req.title || "";
        const description = req.description || "";
        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || req.category === categoryFilter;
        return isNotMine && matchesSearch && matchesCategory;
      })
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawNearby, searchQuery, categoryFilter, user?.uid]);

  const handleCancelRequest = (requestId: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, "requests", requestId));
    toast({ title: "Request Cancelled" });
  };

  const handleCompleteRequest = async (request: any) => {
    if (!db || !user) return;
    setLoading(true);
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

      // Close Chat
      await closeChat(db, request.id);

      if (request.acceptedBy) {
        await sendNotification(db, request.acceptedBy, { 
          title: "Mission Completed! 🏆", 
          message: `The neighbor you helped has marked the mission as complete.`, 
          type: "completed", 
          link: "/profile" 
        });
        setShowRatingFor({ id: request.id, helperId: request.acceptedBy });
      }
      toast({ title: "Mission Completed!", description: "Thank you for strengthening our community!" });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Action Failed", description: "Verify helper info or try again." });
    } finally {
      setLoading(false);
    }
  };

  const isProfileIncomplete = !profile?.phone || !profile?.location?.area;

  const categories = [
    { id: "all", label: "All", icon: Filter },
    { id: "blood", label: "Blood", icon: Droplets, color: "text-red-500" },
    { id: "tutor", label: "Tutor", icon: BookOpen, color: "text-blue-500" },
    { id: "repair", label: "Repair", icon: Wrench, color: "text-amber-500" },
    { id: "emergency", label: "Emergency", icon: AlertTriangle, color: "text-rose-500" },
  ];

  const quickActions = [
    { label: "Need Blood", icon: "🩸", cat: "blood", urg: "high", color: "bg-red-50 text-red-600 border-red-100" },
    { label: "Need Tutor", icon: "📚", cat: "tutor", urg: "low", color: "bg-blue-50 text-blue-600 border-blue-100" },
    { label: "Need Repair", icon: "🔧", cat: "repair", urg: "medium", color: "bg-amber-50 text-amber-600 border-amber-100" },
    { label: "Emergency", icon: "🚨", cat: "emergency", urg: "high", color: "bg-rose-50 text-rose-600 border-rose-100" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20">
      <AnnouncementBanner />
      
      <section className="bg-gradient-to-br from-primary via-primary/90 to-secondary pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="container mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-3 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-headline font-bold text-white tracking-tight">Hello, {profile?.name || "Neighbor"} 👋</h1>
            <p className="text-indigo-100 font-medium">You have <span className="text-white font-bold">{myActiveRequests.length} active requests</span>.</p>
          </div>
          <Link href="/requests/new">
            <Button size="lg" className="h-16 px-8 bg-white text-primary hover:bg-indigo-50 font-bold rounded-full shadow-2xl transition-all active:scale-95">
              Need Help? Post Now <Plus className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <main className="container px-4 sm:px-6 mx-auto -mt-12 relative z-20 space-y-8">
        {isProfileIncomplete && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-dashed border-amber-200 dark:border-amber-900/50 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-2xl">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">⚡ Complete your profile for faster matches!</h4>
                <p className="text-xs text-amber-700/70 dark:text-amber-500/70">Add your phone and area to get better help from neighbors.</p>
              </div>
            </div>
            <EditProfileModal profile={profile} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl group">
            <CardContent className="pt-8 pb-8 flex items-center gap-6 px-8">
              <div className="bg-primary/10 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Requests Posted</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {isMyRequestsLoading ? <Skeleton className="h-9 w-12" /> : stats.posted}
                </h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl group">
            <CardContent className="pt-8 pb-8 flex items-center gap-6 px-8">
              <div className="bg-emerald-100 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Missions Succeeded</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {isMyRequestsLoading ? <Skeleton className="h-9 w-12" /> : stats.succeeded}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl group">
            <CardContent className="pt-8 pb-8 flex items-center gap-6 px-8">
              <div className="bg-amber-100 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <Star className="w-8 h-8 text-amber-600 fill-amber-400" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Neighbor Rating</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {stats.rating}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.label} href={`/requests/new?cat=${action.cat}&urg=${action.urg}`}>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full h-16 rounded-2xl border-2 font-bold transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3",
                  action.color
                )}
              >
                <span className="text-xl">{action.icon}</span>
                <span className="text-sm">{action.label}</span>
              </Button>
            </Link>
          ))}
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <PlusCircle className="w-6 h-6 text-primary" /> My Active Broadcasts
            </h2>
            <Link href="/requests/my" className="text-sm font-bold text-primary hover:underline">View History</Link>
          </div>
          
          {isMyRequestsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
            </div>
          ) : myActiveRequests.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 font-medium">No active requests. Need help? Post now!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myActiveRequests.map((req) => (
                <Card key={req.id} className="rounded-3xl border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden flex flex-col group relative">
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    req.urgency === 'high' ? "bg-red-500" : req.urgency === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                  )} />
                  <CardHeader className="pb-2 pt-6 pl-8">
                    <div className="flex justify-between items-start">
                      <Badge className={cn(
                        "capitalize px-3 py-1 text-[10px] font-black rounded-full border-none",
                        req.status === 'open' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {req.status === 'open' ? "Waiting for Help" : "Help is Coming"}
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400">
                        {req.createdAt ? formatDistanceToNow(req.createdAt.toDate()) : "just now"} ago
                      </span>
                    </div>
                    <CardTitle className="text-lg font-headline font-bold mt-3 leading-tight flex items-center gap-2">
                      <span className="text-xl">
                        {req.category === 'blood' ? '🩸' : req.category === 'tutor' ? '📚' : req.category === 'repair' ? '🔧' : req.category === 'emergency' ? '🚨' : '💬'}
                      </span>
                      {req.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow pl-8">
                    <p className="text-sm text-slate-500 line-clamp-2 mb-2">{req.description}</p>
                    {req.status === 'accepted' && req.acceptedBy && (
                      <HelperContactBox helperId={req.acceptedBy} onChat={() => setChatRequestId(req.id)} />
                    )}
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-slate-50 flex gap-2 pl-8 pr-6 pb-6">
                    {req.status === 'open' ? (
                      <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-red-500 font-bold hover:bg-red-50" onClick={() => handleCancelRequest(req.id)}>
                        <XCircle className="w-4 h-4 mr-2" /> Cancel Request
                      </Button>
                    ) : (
                      <Button variant="default" size="sm" className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold" onClick={() => handleCompleteRequest(req)} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Mark as Complete
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <LayoutGrid className="w-6 h-6 text-indigo-500" /> Neighborhood Missions
              </h2>
              <p className="text-slate-500 text-sm">Open requests near you from other neighbors</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    onClick={() => setCategoryFilter(cat.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-5 font-bold h-10 border transition-all text-xs",
                      categoryFilter === cat.id ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-500 hover:border-primary/30"
                    )}
                  >
                    <cat.icon className={cn("w-3.5 h-3.5", cat.color)} /> {cat.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search missions..." 
                  className="pl-11 h-10 bg-white border-slate-200 rounded-full text-xs shadow-sm" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {isNearbyLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}
            </div>
          ) : filteredNearby.length === 0 ? (
            <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed flex flex-col items-center gap-4">
              <AlertCircle className="w-12 h-12 text-slate-200" />
              <p className="text-slate-500 font-medium">No other open missions found in this category.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredNearby.map((request) => (
                <Card 
                  key={request.id} 
                  className={cn(
                    "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl bg-white dark:bg-slate-900 border-none flex flex-col h-full rounded-[2rem]",
                    request.urgency === 'high' ? "ring-2 ring-red-500 animate-pulse-red" : ""
                  )}
                >
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    request.urgency === 'high' ? 'bg-red-500' : request.urgency === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />
                  <CardHeader className="pb-2 pt-8 pl-8 pr-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-100 bg-slate-50">
                          {request.category}
                        </Badge>
                      </div>
                      <Badge className={cn(
                        "text-[9px] font-black uppercase border-none",
                        request.urgency === 'high' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {request.urgency}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-headline font-bold leading-tight group-hover:text-primary transition-colors">
                      {request.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow pl-8 pr-6">
                    <p className="text-slate-500 text-xs line-clamp-3 mb-4 leading-relaxed">{request.description}</p>
                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">{request.postedByName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{request.postedByName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{request.location?.area || "Campus"}</div>
                        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" />{request.createdAt ? formatDistanceToNow(request.createdAt.toDate()) : "just now"} ago</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 pb-8 pl-8 pr-6">
                    <p className="text-[10px] italic text-slate-400 text-center w-full">Only volunteers can accept this mission</p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      {showRatingFor && (
        <RatingModal 
          requestId={showRatingFor.id} 
          toUser={showRatingFor.helperId} 
          onClose={() => setShowRatingFor(null)} 
        />
      )}

      {chatRequestId && (
        <ChatModal 
          requestId={chatRequestId} 
          isOpen={!!chatRequestId} 
          onClose={() => setChatRequestId(null)} 
        />
      )}
    </div>
  );
}
