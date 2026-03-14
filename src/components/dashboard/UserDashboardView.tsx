"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  collection, 
  query, 
  where, 
  doc,
  increment,
  runTransaction
} from "firebase/firestore";
import { 
  useFirestore, 
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
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { User } from "firebase/auth";
import { sendNotification } from "@/firebase/notifications";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";

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

export function UserDashboardView({ profile, user }: { profile: any; user: User }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const myRequestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "requests"), where("createdBy", "==", user.uid));
  }, [db, user?.uid]);
  const { data: rawMyRequests, isLoading: isMyRequestsLoading } = useCollection(myRequestsQuery);

  const myRequests = useMemo(() => {
    if (!rawMyRequests) return [];
    return [...rawMyRequests]
      .filter(req => req.status === 'open' || req.status === 'accepted')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawMyRequests]);

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
        transaction.update(reqRef, { status: "completed" });
        if (request.acceptedBy) {
          const volunteerRef = doc(db, "users", request.acceptedBy);
          transaction.update(volunteerRef, { totalHelped: increment(1) });
        }
      });
      if (request.acceptedBy) {
        await sendNotification(db, request.acceptedBy, { title: "Mission Completed! 🏆", message: `The neighbor you helped has marked the mission as complete.`, type: "completed", link: "/profile" });
      }
      toast({ title: "Mission Completed!" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleOfferHelp = async (request: any) => {
    if (!db || !user) return;
    const responseTime = Date.now() - (request.createdAt?.toDate().getTime() || Date.now());
    updateDocumentNonBlocking(doc(db, "requests", request.id), { status: "accepted", acceptedBy: user.uid, responseTime });
    await sendNotification(db, request.createdBy, { title: "Help is on the way! 🚀", message: `${profile.name} has accepted your request.`, type: "accepted", link: "/requests/my" });
    toast({ title: "Help Offered!" });
  };

  const categories = [
    { id: "all", label: "All", icon: Filter },
    { id: "blood", label: "Blood", icon: Droplets, color: "text-red-500" },
    { id: "tutor", label: "Tutor", icon: BookOpen, color: "text-blue-500" },
    { id: "repair", label: "Repair", icon: Wrench, color: "text-amber-500" },
    { id: "emergency", label: "Emergency", icon: AlertTriangle, color: "text-rose-500" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20">
      <AnnouncementBanner />
      <section className="bg-gradient-to-br from-primary via-primary/90 to-secondary pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="container mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-3 text-center md:text-left"><h1 className="text-3xl md:text-5xl font-headline font-bold text-white tracking-tight">Hello, {profile?.name || "Neighbor"} 👋</h1><p className="text-indigo-100 font-medium">You have <span className="text-white font-bold">{myRequests.length} active requests</span>.</p></div>
          <Link href="/requests/new"><Button size="lg" className="h-16 px-8 bg-white text-primary hover:bg-indigo-50 font-bold rounded-full shadow-2xl transition-all active:scale-95">Need Help? Post Now <Plus className="ml-2 w-5 h-5" /></Button></Link>
        </div>
      </section>
      <main className="container px-4 sm:px-6 mx-auto -mt-12 relative z-20 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl group"><CardContent className="pt-8 pb-8 flex items-center gap-6 px-8"><div className="bg-primary/10 p-4 rounded-2xl group-hover:scale-110 transition-transform"><Zap className="w-8 h-8 text-primary" /></div><div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Requests Posted</p><h3 className="text-3xl font-black text-slate-900 dark:text-white">{profile?.totalRatingsCount || 0}</h3></div></CardContent></Card>
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl group"><CardContent className="pt-8 pb-8 flex items-center gap-6 px-8"><div className="bg-emerald-100 p-4 rounded-2xl group-hover:scale-110 transition-transform"><Heart className="w-8 h-8 text-emerald-600" /></div><div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Missions Succeeded</p><h3 className="text-3xl font-black text-slate-900 dark:text-white">{profile?.totalHelped || 0}</h3></div></CardContent></Card>
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl group"><CardContent className="pt-8 pb-8 flex items-center gap-6 px-8"><div className="bg-amber-100 p-4 rounded-2xl group-hover:scale-110 transition-transform"><Star className="w-8 h-8 text-amber-600 fill-amber-600" /></div><div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Neighbor Rating</p><h3 className="text-3xl font-black text-slate-900 dark:text-white">{profile?.rating?.toFixed(1) || "5.0"}</h3></div></CardContent></Card>
        </div>
        <section className="space-y-6">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-white flex items-center gap-3"><PlusCircle className="w-6 h-6 text-primary" /> My Active Broadcasts</h2><Link href="/requests/my" className="text-sm font-bold text-primary hover:underline">View History</Link></div>
          {isMyRequestsLoading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div> : myRequests.length === 0 ? <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800"><p className="text-slate-500 font-medium">No active requests.</p></div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{myRequests.map((req) => (
            <Card key={req.id} className="rounded-3xl border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden flex flex-col group"><div className={cn("h-2 w-full", req.status === 'open' ? 'bg-blue-500' : 'bg-amber-500')} /><CardHeader className="pb-2"><div className="flex justify-between items-start"><Badge className={cn("capitalize px-3 py-1 text-[10px] font-black rounded-full", req.status === 'open' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")}>{req.status}</Badge><span className="text-[10px] font-bold text-slate-400">{req.createdAt ? formatDistanceToNow(req.createdAt.toDate()) : "just now"} ago</span></div><CardTitle className="text-lg font-headline font-bold mt-3 leading-tight">{req.title}</CardTitle></CardHeader><CardContent className="flex-grow"><p className="text-sm text-slate-500 line-clamp-2">{req.description}</p>{req.status === 'accepted' && req.acceptedBy && <HelperInfo helperId={req.acceptedBy} />}</CardContent><CardFooter className="pt-4 border-t border-slate-50 flex gap-2">{req.status === 'open' ? <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-red-500 font-bold" onClick={() => handleCancelRequest(req.id)}><XCircle className="w-4 h-4 mr-2" /> Cancel</Button> : <Button variant="default" size="sm" className="flex-1 rounded-xl bg-emerald-500 text-white font-bold" onClick={() => handleCompleteRequest(req)} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}Mark Complete</Button>}</CardFooter></Card>
          ))}</div>}
        </section>
        <section className="space-y-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between"><h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-white flex items-center gap-3"><LayoutGrid className="w-6 h-6 text-indigo-500" /> Neighborhood Missions</h2><div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto"><div className="flex flex-wrap gap-2">{categories.map((cat) => (<button key={cat.id} onClick={() => setCategoryFilter(cat.id)} className={cn("flex items-center gap-2 rounded-full px-5 font-bold h-10 border transition-all text-xs", categoryFilter === cat.id ? "bg-slate-900 text-white" : "bg-white text-slate-500")}><cat.icon className={cn("w-3.5 h-3.5", cat.color)} /> {cat.label}</button>))}</div><div className="relative w-full md:w-64"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search missions..." className="pl-11 h-10 bg-white rounded-full text-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div></div>
          {isNearbyLoading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}</div> : filteredNearby.length === 0 ? <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed"><p className="text-slate-500">No missions found.</p></div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{filteredNearby.map((request) => (
            <Card key={request.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl bg-white rounded-[2rem] border-none flex flex-col h-full"><div className={cn("absolute left-0 top-0 bottom-0 w-1.5", request.urgency === 'high' ? 'bg-red-500' : 'bg-emerald-500')} /><CardHeader className="pb-2 pt-8 pl-8 pr-6"><div className="flex justify-between items-start mb-3"><Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{request.category}</Badge><Badge className={cn("text-[9px] font-black uppercase", request.urgency === 'high' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>{request.urgency}</Badge></div><CardTitle className="text-lg font-headline font-bold">{request.title}</CardTitle></CardHeader><CardContent className="flex-grow pl-8 pr-6"><p className="text-slate-500 text-xs line-clamp-3 mb-4">{request.description}</p><div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 border-t pt-4"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{request.location?.area}</div><div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" />{request.createdAt ? formatDistanceToNow(request.createdAt.toDate()) : "just now"} ago</div></div></CardContent><CardFooter className="pt-4 pb-8 pl-8 pr-6"><Button className="w-full bg-slate-900 text-white rounded-2xl font-bold" onClick={() => handleOfferHelp(request)}>Offer Help <ArrowRight className="ml-2 w-4 h-4" /></Button></CardFooter></Card>
          ))}</div>}
        </section>
      </main>
    </div>
  );
}
