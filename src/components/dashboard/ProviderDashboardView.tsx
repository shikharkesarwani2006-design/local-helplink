
"use client";

import { useState, useMemo } from "react";
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
  useMemoFirebase, 
  updateDocumentNonBlocking 
} from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Briefcase, 
  CheckCircle2, 
  TrendingUp, 
  Star, 
  ShieldCheck, 
  MapPin, 
  AlertCircle,
  Loader2,
  Zap,
  ShieldAlert,
  Clock,
  BarChart as BarChartIcon,
  PartyPopper,
  MessageSquare,
  Phone,
  CircleDollarSign,
  Heart
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { formatDistanceToNow, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { User as FirebaseUser } from "firebase/auth";
import { sendNotification } from "@/firebase/notifications";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";
import { ChatModal } from "@/components/chat/ChatModal";
import { createChat, closeChat } from "@/firebase/chat";
import { useSearchParams, useRouter } from "next/navigation";

export function ProviderDashboardView({ profile, user }: { profile: any; user: FirebaseUser }) {
  const db = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);

  const activeTab = searchParams.get("tab") || "overview";

  const [completingJob, setCompletingJob] = useState<any>(null);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [duration, setDuration] = useState("1");
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastEarnings, setLastEarnings] = useState(0);

  const isUnverified = !profile?.verified;

  const jobsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "requests"), where("acceptedBy", "==", user.uid));
  }, [db, user?.uid]);
  const { data: rawJobs, isLoading: isJobsLoading } = useCollection(jobsQuery);

  const activeJobs = useMemo(() => {
    if (!rawJobs) return [];
    return [...rawJobs]
      .filter(j => j.status === 'accepted')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawJobs]);

  const completedJobs = useMemo(() => {
    if (!rawJobs) return [];
    return [...rawJobs]
      .filter(j => j.status === 'completed')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawJobs]);

  const incomingQuery = useMemoFirebase(() => {
    if (!db || !profile?.serviceCategory) return null;
    return query(collection(db, "requests"), where("status", "==", "open"));
  }, [db, profile?.serviceCategory]);
  const { data: rawIncoming, isLoading: isIncomingLoading } = useCollection(incomingQuery);

  const incomingRequests = useMemo(() => {
    if (!rawIncoming) return [];
    return [...rawIncoming]
      .filter(r => r.category === profile.serviceCategory?.toLowerCase())
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      .slice(0, 3);
  }, [rawIncoming, profile?.serviceCategory]);

  const stats = useMemo(() => {
    if (!completedJobs) return { thisWeek: 0, avgResponse: "0m", revenue: profile?.totalEarnings || 0 };
    
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const thisWeek = completedJobs.filter(j => {
      const date = j.completedAt?.toDate() || j.createdAt?.toDate() || new Date();
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    }).length;

    const responseTimes = completedJobs
      .map(j => j.responseTime)
      .filter(t => t !== undefined && t !== null);
    
    const avgMs = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    const avgMins = Math.round(avgMs / 60000);

    return {
      thisWeek,
      avgResponse: avgMins > 0 ? `${avgMins}m` : "15m",
      revenue: profile?.totalEarnings || 0
    };
  }, [completedJobs, profile?.totalEarnings]);

  const performanceData = useMemo(() => {
    const data = [];
    for (let i = 3; i >= 0; i--) {
      const start = startOfWeek(subDays(new Date(), i * 7));
      const end = endOfWeek(subDays(new Date(), i * 7));
      const count = completedJobs?.filter(j => {
        const date = j.completedAt?.toDate() || j.createdAt?.toDate() || new Date();
        return isWithinInterval(date, { start, end });
      }).length || 0;
      
      data.push({
        name: i === 0 ? "This Week" : `W-${i}`,
        jobs: count
      });
    }
    return data;
  }, [completedJobs]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'overview') params.delete('tab');
    else params.set('tab', value);
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleToggleAvailability = (checked: boolean) => {
    if (!db || !user?.uid) return;
    updateDocumentNonBlocking(doc(db, "users", user.uid), { isAvailable: checked });
    toast({ title: checked ? "Accepting Jobs" : "Status: Busy" });
  };

  const handleAcceptJob = async (request: any) => {
    if (!db || !user?.uid || !profile || !request || !request.createdBy) return;

    if (!profile.verified) {
      toast({
        variant: "destructive",
        title: "Verification Required",
        description: "Your account needs admin verification before accepting jobs",
      });
      return;
    }

    setActionLoading(true);
    try {
      const requestRef = doc(db, "requests", request.id);
      const responseTime = Date.now() - (request.createdAt?.toMillis() || Date.now());
      
      // Default pricing for quick accept: use profile hourly rate or free
      const pricingInfo = {
        serviceCharge: profile.hourlyRate || 0,
        chargeType: profile.hourlyRate ? 'hourly' : 'fixed',
        isFreeService: !profile.hourlyRate
      };

      updateDocumentNonBlocking(requestRef, {
        status: "accepted",
        acceptedBy: user.uid,
        acceptedAt: serverTimestamp(),
        responseTime: responseTime,
        ...pricingInfo
      });

      await createChat(db, request, user.uid, pricingInfo);

      const userRef = doc(db, "users", user.uid);
      updateDocumentNonBlocking(userRef, { isAvailable: false });

      if (request.createdBy) {
        await sendNotification(db, request.createdBy, {
          title: "Expert Assigned! 🔧",
          message: `${profile.name} has accepted your request.`,
          type: "accepted",
          link: "/requests/my"
        });
      }

      toast({ title: "Job Accepted!" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!db || !user?.uid || !completingJob || !completingJob.createdBy) return;
    setActionLoading(true);
    try {
      // Calculate final earnings
      let finalEarnings = completingJob.serviceCharge || 0;
      if (completingJob.chargeType === 'hourly') {
        finalEarnings = Number(duration) * (completingJob.serviceCharge || 0);
      }

      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", completingJob.id);
        const providerRef = doc(db, "users", user.uid);
        
        transaction.update(reqRef, { 
          status: "completed", 
          completedAt: serverTimestamp(), 
          duration: Number(duration), 
          summary: summary,
          finalEarning: finalEarnings 
        });
        
        transaction.update(providerRef, { 
          totalJobsDone: increment(1), 
          totalEarnings: increment(finalEarnings), 
          isAvailable: true 
        });
      });

      await closeChat(db, completingJob.id);

      if (completingJob.createdBy) {
        await sendNotification(db, completingJob.createdBy, { 
          title: "Job Completed! 🎉", 
          message: `${profile.name} marked the service as complete.`, 
          type: "completed", 
          link: "/profile" 
        });
      }

      setLastEarnings(finalEarnings);
      setShowCelebration(true);
      setCompletingJob(null);
      setSummary("");
      setDuration("1");
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20">
      <AnnouncementBanner />
      {isUnverified && (
        <div className="bg-amber-500 text-white py-3 px-6 text-center font-bold text-sm flex items-center justify-center gap-2 sticky top-16 z-50 shadow-lg">
          <ShieldAlert className="w-4 h-4" /> Your account needs admin verification before accepting jobs
        </div>
      )}
      <section className="bg-slate-900 pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30" />
        <div className="container mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white/10 ring-4 ring-primary/20"><AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'member'}`} /><AvatarFallback className="bg-primary text-white font-bold">{profile?.name?.[0] || '?'}</AvatarFallback></Avatar>
                {profile?.verified && <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-slate-900 shadow-xl"><ShieldCheck className="w-6 h-6" /></div>}
              </div>
              <div className="space-y-1 text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3"><h1 className="text-3xl font-headline font-bold text-white tracking-tight">Welcome, {profile?.name} 👋</h1><Badge className="bg-primary/20 text-primary-foreground border-primary/30 uppercase text-[10px] font-black px-3 py-1">{profile?.serviceCategory || "Provider"}</Badge></div>
                <p className="text-white/60 text-sm font-medium flex items-center justify-center lg:justify-start gap-2"><MapPin className="w-3.5 h-3.5" /> {profile?.serviceArea || "All Campus"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
               <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center min-w-[120px]"><p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Rating</p><div className="flex items-center justify-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /><span className="text-xl font-black text-white">{profile?.rating?.toFixed(1) || "5.0"}</span></div></div>
               <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center min-w-[120px]"><p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Total Earnings</p><div className="flex items-center justify-center gap-1"><span className="text-xl font-black text-emerald-400">₹{stats.revenue}</span></div></div>
            </div>
          </div>
        </div>
      </section>
      <main className="container px-4 sm:px-6 mx-auto -mt-12 relative z-20 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Total Jobs Done", value: profile?.totalJobsDone || 0, icon: Briefcase, color: "bg-blue-100 text-blue-600" },
            { label: "This Week", value: stats.thisWeek, icon: TrendingUp, color: "bg-emerald-100 text-emerald-600" },
            { label: "Avg Response", value: stats.avgResponse, icon: Clock, color: "bg-purple-100 text-purple-600" },
            { label: "Community Rating", value: profile?.rating?.toFixed(1) + " ★", icon: Star, color: "bg-amber-100 text-amber-600" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl group overflow-hidden"><CardContent className="pt-6 pb-6 flex items-center gap-4 px-6"><div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", stat.color)}><stat.icon className="w-5 h-5" /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p><h3 className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</h3></div></CardContent></Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-12">
          <div className="flex items-center justify-center">
            <TabsList className="bg-white/50 dark:bg-slate-900/50 p-1 rounded-2xl border backdrop-blur-sm shadow-sm h-14">
              <TabsTrigger value="overview" className="rounded-xl font-bold px-10 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">Overview</TabsTrigger>
              <TabsTrigger value="active" className="rounded-xl font-bold px-10 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">Active Jobs ({activeJobs.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 animate-in fade-in duration-500">
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                      <div className="space-y-4 text-center md:text-left"><div className="flex items-center gap-3 justify-center md:justify-start"><div className={cn("w-3 h-3 rounded-full animate-pulse", profile?.isAvailable ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-red-500 shadow-[0_0_10px_#ef4444]")} /><h2 className="text-2xl font-headline font-bold">{profile?.isAvailable ? "You are Available" : "You are Currently Busy"}</h2></div><div className="space-y-1"><p className="text-sm font-medium text-slate-500">Available hours: <span className="text-slate-900 dark:text-white font-bold">{profile?.workingHours?.from} - {profile?.workingHours?.to}</span></p><p className="text-sm font-medium text-slate-500">Service Area: <span className="text-slate-900 dark:text-white font-bold">{profile?.serviceArea}</span></p></div></div>
                      <div className="flex flex-col items-center gap-2"><Switch checked={profile?.isAvailable || false} onCheckedChange={handleToggleAvailability} className="data-[state=checked]:bg-emerald-500 scale-150" /><span className="text-[10px] font-black uppercase text-slate-400 mt-2">Toggle Status</span></div>
                    </div>
                  </CardContent>
                </Card>
                <section className="space-y-6">
                  <div className="flex items-center justify-between"><h2 className="text-2xl font-headline font-bold flex items-center gap-3"><Zap className="w-6 h-6 text-primary" /> New Job Requests</h2><Button variant="ghost" className="text-primary font-bold text-sm" asChild><a href="/provider/jobs">View All Jobs →</a></Button></div>
                  {isIncomingLoading ? <div className="grid grid-cols-1 gap-4">{[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div> : incomingRequests.length === 0 ? <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed"><AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500 font-medium">No new inquiries in your category yet.</p></div> : <div className="grid grid-cols-1 gap-4">{incomingRequests.map((req) => (
                    <Card key={req.id} className="rounded-3xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow group">
                      <div className={cn("w-full md:w-2", req.urgency === 'high' ? "bg-red-500" : req.urgency === 'medium' ? "bg-amber-500" : "bg-emerald-500")} />
                      <div className="p-6 flex-grow flex flex-col md:flex-row justify-between items-center gap-6"><div className="space-y-1 text-center md:text-left flex-grow"><div className="flex items-center gap-2 justify-center md:justify-start mb-1"><Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none text-[9px] font-black uppercase">{req.urgency}</Badge><span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {req.createdAt ? formatDistanceToNow(req.createdAt.toDate()) : "just now"} ago</span></div><h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{req.title}</h4><p className="text-xs text-slate-500 line-clamp-1 flex items-center gap-1 justify-center md:justify-start"><MapPin className="w-3.5 h-3.5" /> {req.location?.area}</p></div><Button className="rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-bold h-12 px-8 active:scale-95 transition-all w-full md:w-auto" onClick={() => handleAcceptJob(req)} disabled={isUnverified || actionLoading}>Quick Accept</Button></div>
                    </Card>
                  ))}</div>}
                </section>
              </div>
              <div className="lg:col-span-4 space-y-8">
                <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden h-fit"><CardHeader className="pb-2"><CardTitle className="text-lg font-headline font-bold flex items-center gap-2"><BarChartIcon className="w-5 h-5 text-primary" /> Performance</CardTitle><CardDescription>Jobs completed per week</CardDescription></CardHeader><CardContent className="h-[250px] mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={performanceData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} /><YAxis hide /><Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} /><Bar dataKey="jobs" radius={[6, 6, 0, 0]} barSize={24}>{performanceData.map((entry, index) => (<Cell key={`cell-${index}`} fill={index === performanceData.length - 1 ? 'hsl(var(--primary))' : '#e2e8f0'} />))}</Bar></BarChart></ResponsiveContainer></CardContent></Card>
                <section className="space-y-4">
                  <h3 className="text-xl font-headline font-bold flex items-center gap-2"><Briefcase className="w-5 h-5 text-amber-500" /> Active Job</h3>
                  {isJobsLoading ? <Skeleton className="h-48 rounded-3xl" /> : activeJobs.length === 0 ? <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed"><p className="text-xs text-slate-400 font-medium">No active jobs right now.</p></div> : activeJobs.slice(0, 1).map((job) => (
                    <Card key={job.id} className="rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col border-l-4 border-l-amber-500 group">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center"><Badge className="bg-amber-50 text-amber-700 text-[10px] font-black uppercase">In Progress</Badge></div>
                        <CardTitle className="text-base font-bold leading-tight mt-2">{job.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-3 border dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 ring-2 ring-white"><AvatarFallback>{job.postedByName?.[0]}</AvatarFallback></Avatar>
                            <div className="flex flex-col"><span className="text-sm font-bold">{job.postedByName}</span><span className="text-[10px] text-slate-400">{job.location?.area}</span></div>
                          </div>
                        </div>
                        {job.serviceCharge > 0 && (
                          <div className="flex items-center justify-between px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                            <span className="text-[10px] font-black uppercase text-slate-400">Agreed</span>
                            <span className="text-sm font-black text-emerald-600">₹{job.serviceCharge} ({job.chargeType})</span>
                          </div>
                        )}
                        <Button className="w-full bg-primary text-white font-bold h-10 rounded-xl gap-2 shadow-lg shadow-primary/20" onClick={() => setChatRequestId(job.id)}>
                          <MessageSquare className="w-4 h-4" /> Chat with Client
                        </Button>
                        <Button className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 shadow-lg shadow-emerald-500/20 transition-all active:scale-95" onClick={() => setCompletingJob(job)} disabled={actionLoading}>
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}Mark Complete
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </section>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="active" className="mt-0 animate-in fade-in duration-500 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-headline font-bold flex items-center gap-3"><Briefcase className="w-8 h-8 text-emerald-500" /> Active Job Queue</h2>
              <Badge className="bg-amber-100 text-amber-700 font-bold px-4 py-1 rounded-full">{activeJobs.length} Ongoing</Badge>
            </div>

            {isJobsLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}
              </div>
            ) : activeJobs.length === 0 ? (
              <div className="py-32 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed space-y-6 shadow-sm">
                <Briefcase className="w-16 h-16 text-slate-200 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Your mission queue is empty</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">Check available jobs to find neighbors who need your expertise.</p>
                </div>
                <Button className="rounded-2xl h-12 px-8 font-bold" onClick={() => router.push('/provider/jobs')}>Find Jobs</Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeJobs.map((job) => (
                  <Card key={job.id} className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col group border-l-4 border-l-amber-500">
                    <CardHeader className="p-8 pb-4">
                      <div className="flex justify-between items-start">
                        <Badge className="bg-amber-50 text-amber-700 text-[10px] font-black uppercase">In Progress</Badge>
                        <span className="text-[10px] font-bold text-slate-400">{formatDistanceToNow(job.acceptedAt?.toDate() || new Date())} ago</span>
                      </div>
                      <CardTitle className="text-xl font-headline font-bold mt-4 leading-tight">{job.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex-grow space-y-6">
                      <p className="text-sm text-slate-500 line-clamp-2">{job.description}</p>
                      
                      {/* Price Badge */}
                      {job.serviceCharge > 0 ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 w-fit">
                          <CircleDollarSign className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">₹{job.serviceCharge} ({job.chargeType})</span>
                        </div>
                      ) : job.isFreeService && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 w-fit">
                          <Heart className="w-4 h-4 text-blue-500" />
                          <span className="text-[10px] font-black text-blue-600 uppercase">Free Service</span>
                        </div>
                      )}

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${job.createdBy}`} />
                            <AvatarFallback>{job.postedByName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">Requester</p>
                            <p className="text-sm font-bold">{job.postedByName}</p>
                          </div>
                        </div>
                        {job.phone && (
                          <Button size="icon" variant="outline" className="rounded-full bg-white dark:bg-slate-900 border-amber-200 text-amber-600 h-10 w-10" asChild>
                            <a href={`tel:${job.phone}`}><Phone className="w-4 h-4" /></a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="p-8 pt-0 flex gap-3">
                      <Button variant="outline" className="flex-1 rounded-xl font-bold h-12 gap-2" onClick={() => setChatRequestId(job.id)}>
                        <MessageSquare className="w-4 h-4" /> Chat
                      </Button>
                      <Button className="flex-[2] rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 gap-2" onClick={() => setCompletingJob(job)}>
                        <CheckCircle2 className="w-4 h-4" /> Complete
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <Dialog open={!!completingJob} onOpenChange={(open) => !open && setCompletingJob(null)}>
        <DialogContent className="rounded-[2.5rem] p-0 sm:max-w-[600px] overflow-hidden border-none shadow-2xl">
          <div className="flex flex-col max-h-[90vh]">
            <div className="flex-grow overflow-y-auto p-8">
              <DialogHeader><DialogTitle className="text-2xl font-headline font-bold">Job Finalization</DialogTitle><DialogDescription>Summarize your work and log time to finalize earnings.</DialogDescription></DialogHeader>
              <div className="py-6 space-y-6">
                <div className="space-y-2"><Label className="font-bold">Work Summary (Optional)</Label><Textarea placeholder="Briefly describe what was done..." className="min-h-[100px] rounded-2xl resize-none" value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
                
                {completingJob?.chargeType === 'hourly' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Hours Spent</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input type="number" min="0.5" step="0.5" className="pl-10 h-12 rounded-xl" value={duration} onChange={(e) => setDuration(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Total Earning</Label>
                      <div className="h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex items-center px-4">
                        <span className="text-emerald-700 dark:text-emerald-400 font-black">₹{Number(duration) * (completingJob?.serviceCharge || 0)}</span>
                      </div>
                    </div>
                  </div>
                ) : completingJob?.serviceCharge > 0 ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400">Agreed Fixed Amount</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">₹{completingJob.serviceCharge}</p>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-center gap-3 text-blue-700 dark:text-blue-400 font-bold">
                    <Heart className="w-5 h-5" /> Free community service
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="p-8 pt-4 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 flex flex-row gap-3">
              <Button variant="ghost" className="flex-1 rounded-2xl font-bold h-14 text-slate-500" onClick={() => setCompletingJob(null)}>Cancel</Button>
              <Button className="flex-[2] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-14 shadow-xl shadow-emerald-500/20" onClick={handleCompleteJob} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Complete Job
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}><DialogContent className="rounded-[3rem] p-12 text-center"><DialogHeader><div className="bg-emerald-100 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce"><PartyPopper className="w-12 h-12 text-emerald-600" /></div><DialogTitle className="text-4xl font-headline font-bold text-slate-900 mb-2">Great Work! 🎉</DialogTitle><DialogDescription className="text-slate-500 mb-8 font-medium">You've successfully resolved another community inquiry.</DialogDescription></DialogHeader><div className="bg-slate-50 rounded-[2rem] p-6 border mb-8 flex justify-around"><div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Earned</p><p className="text-2xl font-black text-emerald-600">₹{lastEarnings}</p></div><div className="w-px bg-slate-200" /><div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Jobs</p><p className="text-2xl font-black text-slate-900">{profile?.totalJobsDone || 0}</p></div></div><Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold text-lg" onClick={() => setShowCelebration(false)}>Back to Hub</Button></DialogContent></Dialog>
      
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
