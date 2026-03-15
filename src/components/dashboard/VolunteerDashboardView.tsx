
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
  updateDocumentNonBlocking,
} from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Search, 
  Zap, 
  Trophy, 
  Star, 
  Heart, 
  TrendingUp, 
  MessageSquare, 
  ChevronRight,
  Shield,
  Phone,
  Mail,
  AlertTriangle,
  XCircle,
  Loader2,
  PartyPopper,
  Medal,
  Briefcase,
  Inbox
} from "lucide-react";
import { formatDistanceToNow, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { User } from "firebase/auth";
import { sendNotification } from "@/firebase/notifications";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";
import { ChatModal } from "@/components/chat/ChatModal";
import { createChat, closeChat } from "@/firebase/chat";
import { useSearchParams, useRouter } from "next/navigation";

export function VolunteerDashboardView({ profile, user }: { profile: any; user: User }) {
  const db = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const activeTab = searchParams.get("tab") || "overview";

  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  
  const [acceptingRequest, setAcceptingRequest] = useState<any>(null);
  const [completingRequest, setCompletingRequest] = useState<any>(null);
  const [cancellingRequest, setCancellingRequest] = useState<any>(null);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const missionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "requests"), where("acceptedBy", "==", user.uid));
  }, [db, user?.uid]);
  const { data: rawUserMissions, isLoading: isMissionsLoading } = useCollection(missionsQuery);

  const activeMissions = useMemo(() => {
    if (!rawUserMissions) return [];
    return [...rawUserMissions]
      .filter(m => m.status === 'accepted')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawUserMissions]);

  const completedMissions = useMemo(() => {
    if (!rawUserMissions) return [];
    return [...rawUserMissions]
      .filter(m => m.status === 'completed')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawUserMissions]);

  const availableQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "requests"), where("status", "==", "open"));
  }, [db]);
  const { data: rawAvailable, isLoading: isAvailableLoading } = useCollection(availableQuery);

  const stats = useMemo(() => {
    if (!completedMissions) return { weekly: 0, avgResponse: "0m" };
    const sevenDaysAgo = subDays(new Date(), 7);
    const weeklyCount = completedMissions.filter(m => (m.completedAt?.toDate() || m.createdAt?.toDate() || new Date()) >= sevenDaysAgo).length;
    const responseTimes = completedMissions.map(m => m.responseTime).filter(t => t !== undefined && t !== null);
    const avgMs = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    const avgMins = Math.round(avgMs / 60000);
    return { weekly: weeklyCount, avgResponse: avgMins > 0 ? `${avgMins}m` : "12m" };
  }, [completedMissions]);

  const processedMissions = useMemo(() => {
    if (!rawAvailable) return [];
    return [...rawAvailable]
      .map(req => {
        const userSkills = profile?.skills || [];
        const title = req.title || "";
        const description = req.description || "";
        const category = req.category || "";
        const isMatch = userSkills.some((s: string) => 
          (title || "").toLowerCase().includes(s.toLowerCase()) || 
          (description || "").toLowerCase().includes(s.toLowerCase()) || 
          (category || "").toLowerCase().includes(s.toLowerCase())
        );
        return { ...req, isMatch };
      })
      .filter(req => {
        const isNotMine = req.createdBy !== user?.uid;
        const title = req.title || "";
        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSkill = !skillFilter || req.isMatch;
        return isNotMine && matchesSearch && matchesSkill;
      })
      .sort((a, b) => {
        if (a.isMatch !== b.isMatch) return a.isMatch ? -1 : 1;
        if (a.urgency !== b.urgency) return a.urgency === 'high' ? -1 : 1;
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      });
  }, [rawAvailable, profile?.skills, searchQuery, skillFilter, user?.uid]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'overview') params.delete('tab');
    else params.set('tab', value);
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleAcceptMission = async () => {
    if (!db || !user || !acceptingRequest) return;
    setLoading(true);
    try {
      const responseTime = Date.now() - (acceptingRequest.createdAt?.toDate().getTime() || Date.now());
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", acceptingRequest.id);
        transaction.update(reqRef, { status: "accepted", acceptedBy: user.uid, acceptedAt: serverTimestamp(), responseTime });
      });
      
      await createChat(db, acceptingRequest, user.uid);

      if (acceptingRequest.createdBy) {
        await sendNotification(db, acceptingRequest.createdBy, { title: "Mission Accepted! 🚀", message: `${profile.name} is coming to help!`, type: "accepted", link: "/requests/my" });
      }
      toast({ title: "Mission Accepted!" });
      setAcceptingRequest(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMission = async () => {
    if (!db || !user || !completingRequest) return;
    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", completingRequest.id);
        const volunteerRef = doc(db, "users", user.uid);
        transaction.update(reqRef, { status: "completed", completedAt: serverTimestamp() });
        transaction.update(volunteerRef, { totalHelped: increment(1) });
      });

      await closeChat(db, completingRequest.id);

      if (completingRequest.createdBy) {
        await sendNotification(db, completingRequest.createdBy, { title: "Mission Completed! 🎉", message: `Your request was marked as complete.`, type: "completed", link: "/profile" });
      }
      setShowSuccess(true);
      setCompletingRequest(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMission = async () => {
    if (!db || !user || !cancellingRequest) return;
    setLoading(true);
    try {
      await updateDocumentNonBlocking(doc(db, "requests", cancellingRequest.id), { status: "open", acceptedBy: null, acceptedAt: null });
      if (cancellingRequest.createdBy) {
        await sendNotification(db, cancellingRequest.createdBy, { title: "Volunteer Cancelled", message: `The volunteer had to cancel.`, type: "cancelled", link: "/requests/my" });
      }
      toast({ title: "Mission Cancelled" });
      setCancellingRequest(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const getRank = (helped: number) => {
    if (helped >= 50) return { label: "Platinum", color: "text-indigo-400", icon: Medal };
    if (helped >= 30) return { label: "Gold", color: "text-amber-500", icon: Trophy };
    if (helped >= 10) return { label: "Silver", color: "text-slate-400", icon: Shield };
    return { label: "Bronze", color: "text-orange-600", icon: Heart };
  };

  const rank = getRank(profile?.totalHelped || 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <AnnouncementBanner />
      <section className="bg-slate-900 pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
        <div className="container mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left"><div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary-foreground border border-primary/30 text-xs font-bold uppercase tracking-widest"><Zap className="w-3.5 h-3.5" /> Verified Volunteer Control</div><h1 className="text-3xl md:text-5xl font-headline font-bold text-white tracking-tight">Impact Hub: {profile?.name}</h1><div className="flex flex-wrap gap-2 justify-center md:justify-start">{profile?.skills?.map((skill: string) => (<Badge key={skill} className="bg-white/10 text-white border-white/20 hover:bg-white/20 transition-colors">{skill}</Badge>))}</div></div>
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 flex items-center gap-6 shadow-2xl"><div className={cn("p-4 rounded-2xl bg-white/10", rank.color)}><rank.icon className="w-8 h-8" /></div><div><p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Volunteer Rank</p><h3 className={cn("text-2xl font-black", rank.color)}>{rank.label} Tier</h3><p className="text-xs text-white/60">{profile?.totalHelped || 0} Missions Completed</p></div></div>
        </div>
      </section>
      <main className="container px-4 sm:px-6 mx-auto -mt-12 relative z-20 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Total Helped", value: profile?.totalHelped || 0, icon: Heart, color: "bg-emerald-100 text-emerald-600" },
            { label: "Weekly Progress", value: stats.weekly, icon: TrendingUp, color: "bg-blue-100 text-blue-600" },
            { label: "Avg Response", value: stats.avgResponse, icon: Clock, color: "bg-purple-100 text-purple-600" },
            { label: "Neighbor Rating", value: profile?.rating?.toFixed(1) || "5.0", icon: Star, color: "bg-amber-100 text-amber-600" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl group overflow-hidden"><CardContent className="pt-6 pb-6 flex items-center gap-4 px-6"><div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", stat.color)}><stat.icon className="w-5 h-5" /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p><h3 className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</h3></div></CardContent></Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-12">
          <div className="flex items-center justify-center">
            <TabsList className="bg-white/50 dark:bg-slate-900/50 p-1 rounded-2xl border backdrop-blur-sm shadow-sm h-14">
              <TabsTrigger value="overview" className="rounded-xl font-bold px-10 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">Overview</TabsTrigger>
              <TabsTrigger value="active" className="rounded-xl font-bold px-10 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">Active Missions ({activeMissions.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 animate-in fade-in duration-500 space-y-12">
            <section className="space-y-6">
              <div className="flex items-center justify-between"><h2 className="text-2xl font-headline font-bold flex items-center gap-3"><CheckCircle2 className="w-6 h-6 text-emerald-500" /> Missions In Progress</h2>{activeMissions.length > 0 && <Button variant="ghost" className="text-primary font-bold gap-2" onClick={() => handleTabChange('active')}>Manage All <ChevronRight className="w-4 h-4" /></Button>}</div>
              {isMissionsLoading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{[1].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div> : activeMissions.length === 0 ? <div className="p-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:bg-slate-900 dark:border-slate-800"><p className="text-slate-500 font-medium">You aren't currently helping anyone. Check the feed below!</p></div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{activeMissions.slice(0, 3).map((req) => (
                <Card key={req.id} className="rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col group border-l-4 border-l-emerald-500"><CardHeader className="pb-2"><div className="flex justify-between items-center mb-2"><Badge className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">Active Help</Badge><span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Ongoing</span></div><CardTitle className="text-lg font-headline font-bold leading-tight">{req.title}</CardTitle></CardHeader><CardContent className="flex-grow space-y-4"><div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-3"><div className="flex items-center gap-3"><Avatar className="h-10 w-10"><AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.createdBy}`} /><AvatarFallback>?</AvatarFallback></Avatar><div className="flex flex-col"><span className="text-sm font-bold">{req.postedByName}</span><span className="text-[10px] text-slate-400">{req.location?.area}</span></div></div></div><Button className="w-full bg-primary text-white font-bold h-10 rounded-xl gap-2 mt-4" onClick={() => setChatRequestId(req.id)}><MessageSquare className="w-4 h-4" /> Chat with Requester</Button></CardContent><CardFooter className="pt-4 border-t border-slate-50 dark:border-slate-800 flex gap-2 p-6"><Button variant="ghost" size="sm" className="flex-1 rounded-xl text-red-500 font-bold" onClick={() => setCancellingRequest(req)}><XCircle className="w-4 h-4 mr-2" /> Cancel</Button><Button variant="default" size="sm" className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold" onClick={() => setCompletingRequest(req)}>Mark Complete</Button></CardFooter></Card>
              ))}</div>}
            </section>
            <section className="space-y-8">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between"><div className="space-y-1"><h2 className="text-2xl font-headline font-bold flex items-center gap-3"><Search className="w-6 h-6 text-primary" /> Available Missions</h2><p className="text-xs text-slate-500 font-medium">Matching your skills & neighborhood area</p></div><div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto"><div className="flex flex-wrap gap-2"><button onClick={() => setSkillFilter(null)} className={cn("px-4 h-10 rounded-full font-bold text-xs border transition-all", !skillFilter ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-500 dark:bg-slate-900")}>All Missions</button><button onClick={() => setSkillFilter("matched")} className={cn("flex items-center gap-2 px-4 h-10 rounded-full font-bold text-xs border transition-all", skillFilter === "matched" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white text-slate-500 dark:bg-slate-900")}><Star className="w-3.5 h-3.5" /> Skill Matches</button></div><div className="relative w-full md:w-64"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search titles..." className="pl-11 h-10 bg-white dark:bg-slate-900 rounded-full text-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div></div>
              {isAvailableLoading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}</div> : processedMissions.length === 0 ? <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed"><h3 className="text-lg font-bold">No Missions Found</h3><p className="text-slate-500 mt-1">Check back later or expand your skills!</p></div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{processedMissions.map((request) => (
                    <Card key={request.id} className={cn("group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white dark:bg-slate-900 border-none flex flex-col h-full rounded-[2rem]", request.isMatch && "ring-2 ring-primary/20")}>
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", request.urgency === 'high' ? 'bg-red-500' : 'bg-slate-200')} />
                      <CardHeader className="pb-2 pt-8 pl-8 pr-6"><div className="flex justify-between items-start mb-4">{request.isMatch ? (<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20"><Star className="w-3.5 h-3.5 fill-primary" /> Skill Match</div>) : (<Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{request.category}</Badge>)}<Badge className={cn("text-[9px] font-black uppercase tracking-widest", request.urgency === 'high' ? "bg-red-50 text-red-600" : "bg-slate-50 dark:bg-slate-800 text-slate-600")}>{request.urgency} Urgency</Badge></div><CardTitle className="text-xl font-headline font-bold leading-tight">{request.title}</CardTitle></CardHeader>
                      <CardContent className="flex-grow space-y-4 pl-8 pr-6"><p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">{request.description}</p><div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase border-t pt-4"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{request.location?.area}</div><div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" />{request.createdAt ? formatDistanceToNow(request.createdAt.toDate()) : "just now"} ago</div></div></CardContent>
                      <CardFooter className="pt-4 pb-8 pl-8 pr-6"><Button className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-2xl font-bold h-12 transition-all group-hover:scale-[1.02]" onClick={() => setAcceptingRequest(request)}>Accept & Help <ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                  ))}</div>}
            </section>
          </TabsContent>

          <TabsContent value="active" className="mt-0 animate-in fade-in duration-500 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-headline font-bold flex items-center gap-3"><Briefcase className="w-8 h-8 text-emerald-500" /> Active Mission Control</h2>
              <Badge className="bg-emerald-100 text-emerald-700 font-bold px-4 py-1 rounded-full">{activeMissions.length} Ongoing</Badge>
            </div>

            {isMissionsLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}
              </div>
            ) : activeMissions.length === 0 ? (
              <div className="py-32 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed space-y-6 shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                  <Inbox className="w-10 h-10 text-slate-200" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No active missions</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">You're not currently signed up for any missions. Check the dashboard to find neighbors who need help.</p>
                </div>
                <Button className="rounded-2xl h-12 px-8 font-bold" onClick={() => handleTabChange('overview')}>Browse Missions</Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeMissions.map((req) => (
                  <Card key={req.id} className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col group border-l-4 border-l-emerald-500">
                    <CardHeader className="p-8 pb-4">
                      <div className="flex justify-between items-start">
                        <Badge className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">Mission Active</Badge>
                        <span className="text-[10px] font-bold text-slate-400">{req.createdAt ? formatDistanceToNow(req.createdAt.toDate()) : "just now"} ago</span>
                      </div>
                      <CardTitle className="text-xl font-headline font-bold mt-4 leading-tight">{req.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex-grow space-y-6">
                      <p className="text-sm text-slate-500 line-clamp-3">{req.description}</p>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.createdBy}`} />
                            <AvatarFallback>{req.postedByName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Requester</p>
                            <p className="text-sm font-bold truncate">{req.postedByName}</p>
                          </div>
                        </div>
                        <div className="pt-3 mt-3 border-t dark:border-slate-700 flex flex-wrap gap-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-primary" /> {req.location?.area}
                          </div>
                          {req.contactPreference === 'call' && (
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                              <Phone className="w-3.5 h-3.5" /> Call Requested
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-8 pt-0 flex flex-col gap-3">
                      <Button className="w-full bg-primary text-white font-bold h-12 rounded-2xl gap-2 shadow-lg shadow-primary/20" onClick={() => setChatRequestId(req.id)}>
                        <MessageSquare className="w-4 h-4" /> Open Coordination Chat
                      </Button>
                      <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1 rounded-xl text-red-500 font-bold h-11" onClick={() => setCancellingRequest(req)}>
                          <XCircle className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11" onClick={() => setCompletingRequest(req)}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!acceptingRequest} onOpenChange={(open) => !open && setAcceptingRequest(null)}>
        <DialogContent className="rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="flex flex-col max-h-[90vh]">
            <div className="flex-grow overflow-y-auto p-8">
              <DialogHeader><DialogTitle className="text-2xl font-bold">Accept Mission?</DialogTitle><DialogDescription>You are committing to help with <strong>"{acceptingRequest?.title}"</strong>.</DialogDescription></DialogHeader>
              <div className="py-6 space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2 border dark:border-slate-700">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Requester Contact</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-700"><AvatarFallback>?</AvatarFallback></Avatar>
                    <div><p className="text-sm font-bold text-slate-900 dark:text-white">{acceptingRequest?.postedByName}</p><p className="text-xs text-slate-500">Member since 2024</p></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-4 h-4" /> Please coordinate safely in public campus areas.
                </div>
              </div>
            </div>
            <DialogFooter className="p-8 pt-4 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 flex flex-row gap-2 sm:gap-0">
              <Button variant="ghost" className="flex-1 rounded-xl font-bold h-12 text-slate-500" onClick={() => setAcceptingRequest(null)}>Cancel</Button>
              <Button className="flex-1 rounded-xl bg-primary text-white font-bold h-12" onClick={handleAcceptMission} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Confirm & Help</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!completingRequest} onOpenChange={(open) => !open && setCompletingRequest(null)}>
        <DialogContent className="rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="flex flex-col max-h-[90vh]">
            <div className="flex-grow overflow-y-auto p-8">
              <DialogHeader><DialogTitle className="text-2xl font-bold">Mark as Completed?</DialogTitle><DialogDescription>Great job! This mission will be removed from your active list.</DialogDescription></DialogHeader>
            </div>
            <DialogFooter className="p-8 pt-4 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 flex flex-row gap-2 sm:gap-0">
              <Button variant="ghost" className="flex-1 rounded-xl font-bold h-12 text-slate-500" onClick={() => setCompletingRequest(null)}>Not Yet</Button>
              <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12" onClick={handleCompleteMission} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Yes, Completed"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!cancellingRequest} onOpenChange={(open) => !open && setCancellingRequest(null)}><DialogContent className="rounded-3xl"><DialogHeader><DialogTitle className="text-2xl font-bold">Cancel Mission?</DialogTitle><DialogDescription>If you can't help anymore, cancelling will put this request back in the public feed.</DialogDescription></DialogHeader><DialogFooter className="gap-2 sm:gap-0 pt-6"><Button variant="ghost" className="flex-1 rounded-xl font-bold" onClick={() => setCompletingRequest(null)}>Keep Helping</Button><Button variant="destructive" className="flex-1 rounded-xl font-bold" onClick={handleCancelMission} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Cancel Mission"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}><DialogContent className="rounded-[3rem] p-12 text-center"><DialogHeader><div className="bg-emerald-100 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce"><PartyPopper className="w-12 h-12 text-emerald-600" /></div><DialogTitle className="text-4xl font-headline font-bold text-slate-900 mb-4">Great job! 🎉</DialogTitle><DialogDescription className="text-slate-500 mb-8 max-sm mx-auto">You've successfully helped a neighbor. Your impact points have been updated!</DialogDescription></DialogHeader><Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold text-lg" onClick={() => setShowSuccess(false)}>Back to Dashboard</Button></DialogContent></Dialog>
      
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
