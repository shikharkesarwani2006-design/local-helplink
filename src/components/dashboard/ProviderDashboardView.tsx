
"use client";

import { useState, useMemo } from "react";
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
  useMemoFirebase, 
  updateDocumentNonBlocking 
} from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Phone,
  PartyPopper
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

export function ProviderDashboardView({ profile, user }: { profile: any; user: FirebaseUser }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);

  // Mark Complete Flow State
  const [completingJob, setCompletingJob] = useState<any>(null);
  const [summary, setSummary] = useState("");
  const [duration, setDuration] = useState("1");
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastEarnings, setLastEarnings] = useState(0);

  const isUnverified = !profile?.verified;

  // 1. ACTIVE JOBS - Removed orderBy
  const activeJobsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "requests"),
      where("acceptedBy", "==", user.uid),
      where("status", "==", "accepted")
    );
  }, [db, user?.uid]);
  const { data: rawActiveJobs, isLoading: isActiveLoading } = useCollection(activeJobsQuery);
  const activeJobs = useMemo(() => {
    if (!rawActiveJobs) return null;
    return [...rawActiveJobs].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawActiveJobs]);

  // 2. INCOMING REQUESTS - Removed orderBy
  const incomingQuery = useMemoFirebase(() => {
    if (!db || !profile?.serviceCategory) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      where("category", "==", profile.serviceCategory.toLowerCase())
    );
  }, [db, profile?.serviceCategory]);
  const { data: rawIncomingRequests, isLoading: isIncomingLoading } = useCollection(incomingQuery);
  const incomingRequests = useMemo(() => {
    if (!rawIncomingRequests) return null;
    return [...rawIncomingRequests]
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      .slice(0, 3);
  }, [rawIncomingRequests]);

  // 3. COMPLETED JOBS - Removed orderBy
  const completedQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "requests"),
      where("acceptedBy", "==", user.uid),
      where("status", "==", "completed")
    );
  }, [db, user?.uid]);
  const { data: rawCompletedJobs } = useCollection(completedQuery);
  const completedJobs = useMemo(() => {
    if (!rawCompletedJobs) return null;
    return [...rawCompletedJobs].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawCompletedJobs]);

  // Stats Calculations
  const stats = useMemo(() => {
    if (!completedJobs) return { thisWeek: 0, avgResponse: "0m", revenue: profile?.totalEarnings || 0 };
    
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const thisWeek = completedJobs.filter(j => {
      const date = j.completedAt?.toDate() || j.createdAt.toDate();
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
        const date = j.completedAt?.toDate() || j.createdAt.toDate();
        return isWithinInterval(date, { start, end });
      }).length || 0;
      
      data.push({
        name: i === 0 ? "This Week" : `W-${i}`,
        jobs: count
      });
    }
    return data;
  }, [completedJobs]);

  const handleToggleAvailability = (checked: boolean) => {
    if (!db || !user?.uid) return;
    updateDocumentNonBlocking(doc(db, "users", user.uid), { isAvailable: checked });
    toast({
      title: checked ? "Accepting Jobs" : "Status: Busy",
      description: checked ? "New job alerts are now active." : "You will no longer receive new job alerts.",
    });
  };

  const handleAcceptJob = async (request: any) => {
    if (!db || !user?.uid || isUnverified) return;
    setActionLoading(true);
    try {
      const responseTime = Date.now() - request.createdAt.toDate().getTime();
      
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", request.id);
        const providerRef = doc(db, "users", user.uid);
        
        transaction.update(reqRef, {
          status: "accepted",
          acceptedBy: user.uid,
          acceptedAt: new Date(),
          responseTime: responseTime
        });

        transaction.update(providerRef, {
          isAvailable: false
        });
      });

      await sendNotification(db, request.createdBy, {
        title: "Expert Assigned! 🔧",
        message: `${profile.name} has accepted your request. Expect a high-quality resolution soon!`,
        type: "accepted",
        link: "/requests/my"
      });

      toast({ title: "Job Accepted!" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to accept job." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!db || !user?.uid || !completingJob) return;
    setActionLoading(true);
    try {
      const hours = Number(duration);
      const earnings = hours * (profile?.hourlyRate || 0);

      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", completingJob.id);
        const providerRef = doc(db, "users", user.uid);
        
        transaction.update(reqRef, { 
          status: "completed",
          completedAt: new Date(),
          duration: hours,
          summary: summary
        });

        transaction.update(providerRef, { 
          totalJobsDone: increment(1),
          totalEarnings: increment(earnings),
          isAvailable: true
        });
      });

      await sendNotification(db, completingJob.createdBy, {
        title: "Job Completed! 🎉",
        message: `${profile.name} marked the service as complete. Please rate your experience!`,
        type: "completed",
        link: "/profile"
      });

      setLastEarnings(earnings);
      setShowCelebration(true);
      setCompletingJob(null);
      setSummary("");
      setDuration("1");
      toast({ title: "Job Completed Successfully!" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to complete job." });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20">
      <AnnouncementBanner />
      {isUnverified && (
        <div className="bg-amber-500 text-white py-3 px-6 text-center font-bold text-sm flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500 sticky top-16 z-50 shadow-lg">
          <ShieldAlert className="w-4 h-4" />
          Pending Admin Verification — Browsing only. Acceptance enabled once verified.
        </div>
      )}

      <section className="bg-slate-900 pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30" />
        <div className="container mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white/10 ring-4 ring-primary/20">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'member'}`} />
                  <AvatarFallback className="bg-primary text-white text-2xl font-bold">{profile?.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                {profile?.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-slate-900 shadow-xl">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="space-y-1 text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <h1 className="text-3xl font-headline font-bold text-white tracking-tight">Welcome back, {profile?.name} 👋</h1>
                  <Badge className="bg-primary/20 text-primary-foreground border-primary/30 uppercase text-[10px] font-black px-3 py-1">
                    {profile?.serviceCategory || "Provider"}
                  </Badge>
                </div>
                <p className="text-white/60 text-sm font-medium flex items-center justify-center lg:justify-start gap-2">
                  <MapPin className="w-3.5 h-3.5" /> {profile?.serviceArea || "All Campus"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
               <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center min-w-[120px]">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Rating</p>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-xl font-black text-white">{profile?.rating?.toFixed(1) || "5.0"}</span>
                  </div>
               </div>
               <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center min-w-[120px]">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Total Earnings</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl font-black text-emerald-400">₹{stats.revenue}</span>
                  </div>
               </div>
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
            <Card key={i} className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl group overflow-hidden">
              <CardContent className="pt-6 pb-6 flex items-center gap-4 px-6">
                <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="space-y-4 text-center md:text-left">
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                      <div className={cn(
                        "w-3 h-3 rounded-full animate-pulse",
                        profile?.isAvailable ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-red-500 shadow-[0_0_10px_#ef4444]"
                      )} />
                      <h2 className="text-2xl font-headline font-bold">
                        {profile?.isAvailable ? "You are Available" : "You are Currently Busy"}
                      </h2>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-500">Available hours: <span className="text-slate-900 dark:text-white font-bold">{profile?.workingHours?.from} - {profile?.workingHours?.to}</span></p>
                      <p className="text-sm font-medium text-slate-500">Service Area: <span className="text-slate-900 dark:text-white font-bold">{profile?.serviceArea}</span></p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Switch 
                      checked={profile?.isAvailable || false} 
                      onCheckedChange={handleToggleAvailability}
                      className="data-[state=checked]:bg-emerald-500 scale-150"
                    />
                    <span className="text-[10px] font-black uppercase text-slate-400 mt-2">Toggle Status</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-headline font-bold flex items-center gap-3">
                  <Zap className="w-6 h-6 text-primary" /> New Job Requests
                </h2>
                <Button variant="ghost" className="text-primary font-bold text-sm" asChild>
                  <a href="/provider/jobs">View All Jobs →</a>
                </Button>
              </div>

              {isIncomingLoading ? (
                <div className="grid grid-cols-1 gap-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
                </div>
              ) : incomingRequests?.length === 0 ? (
                <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed">
                  <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No new inquiries in your category yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {incomingRequests?.map((req) => (
                    <Card key={req.id} className="rounded-3xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow group">
                      <div className={cn("w-full md:w-2", req.urgency === 'high' ? "bg-red-500" : "bg-emerald-500")} />
                      <div className="p-6 flex-grow flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="space-y-1 text-center md:text-left flex-grow">
                          <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none text-[9px] font-black uppercase">{req.urgency}</Badge>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(req.createdAt.toDate())} ago</span>
                          </div>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{req.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-1 flex items-center gap-1 justify-center md:justify-start">
                            <MapPin className="w-3 h-3" /> {req.location?.area}
                          </p>
                        </div>
                        <Button 
                          className="rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-bold h-12 px-8 active:scale-95 transition-all w-full md:w-auto"
                          onClick={() => handleAcceptJob(req)}
                          disabled={isUnverified || actionLoading}
                        >
                          Quick Accept
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                  <BarChartIcon className="w-5 h-5 text-primary" /> Performance
                </CardTitle>
                <CardDescription>Jobs completed per week</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="jobs" radius={[6, 6, 0, 0]} barSize={24}>
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === performanceData.length - 1 ? 'hsl(var(--primary))' : '#e2e8f0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <section className="space-y-4">
              <h3 className="text-xl font-headline font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-500" /> Active Job
              </h3>
              {isActiveLoading ? (
                <Skeleton className="h-48 rounded-3xl" />
              ) : activeJobs?.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed">
                  <p className="text-xs text-slate-400 font-medium">No active jobs right now.</p>
                </div>
              ) : (
                activeJobs?.slice(0, 1).map((job) => (
                  <Card key={job.id} className="rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col border-l-4 border-l-amber-500 group">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge className="bg-amber-50 text-amber-700 text-[10px] font-black uppercase">In Progress</Badge>
                      </div>
                      <CardTitle className="text-base font-bold leading-tight mt-2">{job.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-3 border dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 ring-2 ring-white"><AvatarFallback>{job.postedByName?.[0]}</AvatarFallback></Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{job.postedByName}</span>
                            <span className="text-[10px] text-slate-400">{job.location?.area}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                        onClick={() => setCompletingJob(job)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Mark Complete
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </section>
          </div>
        </div>
      </main>

      <Dialog open={!!completingJob} onOpenChange={(open) => !open && setCompletingJob(null)}>
        <DialogContent className="rounded-[2.5rem] p-8 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">Job Finalization</DialogTitle>
            <DialogDescription>
              Summarize your work and log time to finalize earnings.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold">Work Summary (Optional)</Label>
              <Textarea 
                placeholder="Briefly describe what was done..." 
                className="min-h-[100px] rounded-2xl resize-none"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Hours Spent</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type="number" 
                    min="0.5" 
                    step="0.5" 
                    className="pl-10 h-12 rounded-xl"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Est. Earnings</Label>
                <div className="h-12 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center px-4">
                  <span className="text-emerald-700 font-black">₹{Number(duration) * (profile?.hourlyRate || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" className="flex-1 rounded-2xl font-bold h-14 text-slate-500" onClick={() => setCompletingJob(null)}>Cancel</Button>
            <Button 
              className="flex-[2] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-14 shadow-xl shadow-emerald-500/20" 
              onClick={handleCompleteJob}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Complete Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="rounded-[3rem] p-12 text-center">
           <div className="bg-emerald-100 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
              <PartyPopper className="w-12 h-12 text-emerald-600" />
           </div>
           <h2 className="text-4xl font-headline font-bold text-slate-900 mb-2">Great Work! 🎉</h2>
           <p className="text-slate-500 mb-8 font-medium">You've successfully resolved another community inquiry.</p>
           
           <div className="bg-slate-50 rounded-[2rem] p-6 border mb-8 flex justify-around">
              <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Earned</p>
                 <p className="text-2xl font-black text-emerald-600">₹{lastEarnings}</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Jobs</p>
                 <p className="text-2xl font-black text-slate-900">{profile?.totalJobsDone || 0}</p>
              </div>
           </div>

           <Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold text-lg" onClick={() => setShowCelebration(false)}>
              Back to Hub
           </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
