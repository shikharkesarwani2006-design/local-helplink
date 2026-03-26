"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { query, collection, where, doc } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Star, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  MessageSquare,
  Award,
  MapPin,
  Briefcase,
  TrendingUp,
  CircleDollarSign,
  AlertCircle,
  Coins,
  ArrowUpRight,
  Loader2
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
import { formatDistanceToNow, startOfMonth, isWithinInterval, endOfMonth, subDays, startOfWeek, endOfWeek } from "date-fns";
import { ProviderEditProfileModal } from "@/components/profile/ProviderEditProfileModal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function ProviderProfileContent() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Controlled tab state from URL
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    router.push(`/provider/profile?${params.toString()}`);
  };

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  const ratingsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "ratings"), where("toUser", "==", user.uid));
  }, [db, user?.uid]);
  const { data: rawReviews } = useCollection(ratingsQuery);

  const reviews = useMemo(() => {
    if (!rawReviews) return [];
    return [...rawReviews].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawReviews]);

  const jobsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "requests"), where("acceptedBy", "==", user.uid));
  }, [db, user?.uid]);
  const { data: rawJobs } = useCollection(jobsQuery);

  const completedJobs = useMemo(() => {
    if (!rawJobs) return [];
    return [...rawJobs]
      .filter(j => j.status === 'completed')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawJobs]);

  const stats = useMemo(() => {
    if (!completedJobs) return { monthJobs: 0, monthEarnings: 0 };
    
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const monthJobs = completedJobs.filter(j => {
      const date = j.completedAt?.toDate() || j.createdAt.toDate();
      return isWithinInterval(date, { start, end });
    });

    const monthEarnings = monthJobs.reduce((acc, j) => {
      if (j.finalEarning !== undefined) return acc + j.finalEarning;
      if (j.serviceCharge !== undefined && j.chargeType !== 'hourly') return acc + j.serviceCharge;
      return acc + ((j.duration || 0) * (j.serviceCharge || profile?.hourlyRate || 0));
    }, 0);

    return {
      monthJobs: monthJobs.length,
      monthEarnings
    };
  }, [completedJobs, profile?.hourlyRate]);

  const earningsChartData = useMemo(() => {
    const data = [];
    for (let i = 3; i >= 0; i--) {
      const start = startOfWeek(subDays(new Date(), i * 7));
      const end = endOfWeek(subDays(new Date(), i * 7));
      const weekJobs = completedJobs?.filter(j => {
        const date = j.completedAt?.toDate() || j.createdAt.toDate();
        return isWithinInterval(date, { start, end });
      }) || [];
      
      const earnings = weekJobs.reduce((acc, j) => {
        if (j.finalEarning !== undefined) return acc + j.finalEarning;
        if (j.serviceCharge !== undefined && j.chargeType !== 'hourly') return acc + j.serviceCharge;
        return acc + ((j.duration || 0) * (j.serviceCharge || profile?.hourlyRate || 0));
      }, 0);
      
      data.push({
        name: i === 0 ? "This Week" : `W-${i}`,
        amount: earnings
      });
    }
    return data;
  }, [completedJobs, profile?.hourlyRate]);

  const ratingCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews?.forEach(r => {
      if (r.score >= 1 && r.score <= 5) counts[5 - r.score]++;
    });
    return counts;
  }, [reviews]);

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="container max-w-6xl px-6 mx-auto py-20 space-y-8">
        <Skeleton className="h-64 rounded-[2rem]" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20">
      <div className="bg-slate-900 border-b border-white/5 pt-16 pb-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="container max-w-6xl px-6 mx-auto flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="relative">
            <Avatar className="w-36 h-36 border-4 border-white/10 ring-4 ring-primary/20 shadow-2xl">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email}`} />
              <AvatarFallback className="text-4xl font-headline bg-primary text-white font-bold">
                {profile?.name?.[0]}
              </AvatarFallback>
            </Avatar>
            {profile?.verified && (
              <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-2 rounded-full border-4 border-slate-900 shadow-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="flex-grow text-center md:text-left space-y-4">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <h1 className="text-4xl md:text-5xl font-headline font-bold text-white tracking-tight">{profile?.name}</h1>
              {profile?.verified ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase text-[10px] font-black px-3 py-1">
                  Verified Expert
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 uppercase text-[10px] font-black px-3 py-1">
                  Pending Verification
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm font-medium text-slate-400">
              <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> {profile?.serviceCategory}</div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {profile?.serviceArea || "All Campus"}</div>
              <div className="flex items-center gap-2 text-white font-bold">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                {profile?.rating?.toFixed(1) || "5.0"} <span className="text-slate-500 font-normal">({profile?.totalRatingsCount || 0} reviews)</span>
              </div>
            </div>

            <p className="text-slate-400 max-w-xl mx-auto md:mx-0 leading-relaxed italic">
              "{profile?.bio || "Professional community service provider dedicated to campus support."}"
            </p>
          </div>
          
          <div className="flex flex-col gap-3 shrink-0">
            <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 text-center shadow-lg">
               <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Total Impact</p>
               <p className="text-3xl font-black text-white">{profile?.totalJobsDone || 0} Jobs</p>
            </div>
            <ProviderEditProfileModal profile={profile} />
          </div>
        </div>
      </div>

      <main className="container max-w-6xl px-6 mx-auto -mt-16 relative z-20">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-white dark:bg-slate-900 p-1.5 mb-10 shadow-2xl border dark:border-slate-800 rounded-3xl w-full max-w-2xl mx-auto grid grid-cols-3 h-16 ring-1 ring-black/5">
            <TabsTrigger value="overview" className="font-bold gap-2 rounded-2xl data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <AlertCircle className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="reviews" className="font-bold gap-2 rounded-2xl data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Star className="w-4 h-4" /> Reviews
            </TabsTrigger>
            <TabsTrigger value="earnings" className="font-bold gap-2 rounded-2xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Coins className="w-4 h-4" /> Earnings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-8">
                <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                    <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" /> Service Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Category</p>
                        <Badge className="bg-primary/10 text-primary border-none px-4 py-1.5 font-bold rounded-full capitalize">
                          {profile?.serviceCategory}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Experience</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{profile?.experience || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Service Area</p>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="font-medium">{profile?.serviceArea || "All Campus Areas"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Availability</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile?.availability?.map((day: string) => (
                            <Badge key={day} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold">
                              {day}
                            </Badge>
                          )) || "Daily"}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Working Hours</p>
                        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                          <Clock className="w-4 h-4 text-primary" />
                          {profile?.workingHours?.from} - {profile?.workingHours?.to}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Default Rate</p>
                        <p className="text-2xl font-black text-emerald-600">
                          {profile?.hourlyRate ? `₹${profile.hourlyRate}/hr` : "Free Service"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-headline font-bold">Expert Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 pb-8 px-8">
                    {profile?.skills?.map((skill: string) => (
                      <Badge key={skill} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none px-4 py-2 font-bold text-xs rounded-xl">
                        {skill}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-5 space-y-8">
                <Card className="shadow-xl border-none bg-primary text-white rounded-[2.5rem] overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform">
                    <Award className="w-48 h-48" />
                  </div>
                  <CardHeader className="relative z-10 p-8 pb-0">
                    <CardTitle className="text-2xl font-headline font-bold">Neighborhood Trust</CardTitle>
                    <CardDescription className="text-primary-foreground/70">Cumulative community satisfaction.</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 p-8 pt-6 space-y-8">
                    <div className="flex items-end gap-2">
                      <span className="text-6xl font-black">{profile?.rating?.toFixed(1) || "5.0"}</span>
                      <div className="flex flex-col mb-2">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-white" />)}
                        </div>
                        <span className="text-xs font-bold opacity-70">Community Rating</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span className="opacity-70">Response Speed</span>
                        <span>~12 mins</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span className="opacity-70">Reliability Rate</span>
                        <span>98%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-amber-50 dark:bg-amber-950/20 p-8 rounded-[2.5rem] border-2 border-dashed border-amber-200 dark:border-amber-900/50 flex flex-col gap-4">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-amber-900 dark:text-amber-400">Payment Notice</h4>
                    <p className="text-sm text-amber-800/70 dark:text-amber-500/70 leading-relaxed font-medium">
                      All service payments are currently handled directly between you and your neighbor via cash or UPI. Razorpay automatic settlement is arriving in the next phase!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4">
                <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden sticky top-24">
                  <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                    <CardTitle className="text-lg font-bold">Review Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-4">
                    {[5, 4, 3, 2, 1].map((star, idx) => (
                      <div key={star} className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400 w-4">{star}★</span>
                        <div className="flex-grow h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${reviews.length ? (ratingCounts[idx] / reviews.length) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-8 text-right">{ratingCounts[idx]}</span>
                      </div>
                    ))}
                    <div className="pt-6 border-t dark:border-slate-800 text-center">
                       <p className="text-3xl font-black text-slate-900 dark:text-white">{profile?.rating?.toFixed(1)}</p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Global Reputation</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-8 space-y-6">
                {reviews.length === 0 ? (
                  <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No reviews received yet. Complete your first job to start building your profile!</p>
                  </div>
                ) : (
                  reviews.map((r) => (
                    <Card key={r.id} className="shadow-sm border-none bg-white dark:bg-slate-900 rounded-[2rem] p-8 space-y-6 group hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-slate-50 shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.fromUser}`} />
                            <AvatarFallback>N</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">Verified Neighbor</p>
                            <div className="flex gap-0.5 mt-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={cn("w-3.5 h-3.5", s <= r.score ? "text-amber-400 fill-amber-400" : "text-slate-100")} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {r.createdAt ? formatDistanceToNow(r.createdAt.toDate()) : "just now"} ago
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic text-lg">
                          "{r.comment || "Professional and highly recommended! Very helpful."}"
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Resolution: Campus Task
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="shadow-xl border-none bg-emerald-600 text-white rounded-[2.5rem] p-8 space-y-4">
                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Revenue</p>
                  <h3 className="text-4xl font-black">₹{profile?.totalEarnings || 0}</h3>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-bold">
                  <TrendingUp className="w-4 h-4" /> Lifetime Community Earnings
                </div>
              </Card>

              <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 space-y-4 border-l-4 border-l-primary">
                <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <CircleDollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">This Month</p>
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white">₹{stats.monthEarnings}</h3>
                </div>
                <div className="pt-4 border-t dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" /> {stats.monthJobs} successful jobs
                </div>
              </Card>

              <Card className="shadow-xl border-none bg-slate-900 text-white rounded-[2.5rem] p-8 space-y-4 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5">
                   <TrendingUp className="w-32 h-32" />
                </div>
                <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Next Phase</p>
                  <h3 className="text-2xl font-black">Direct Payouts</h3>
                </div>
                <p className="text-xs text-white/60 font-medium leading-relaxed">
                  Automatic bank settlements via Razorpay integration are currently in internal testing.
                </p>
              </Card>
            </div>

            <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-xl font-headline font-bold">Volume Performance</CardTitle>
                <CardDescription>Earnings growth over the last 4 weeks</CardDescription>
              </CardHeader>
              <CardContent className="p-8 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={earningsChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={40}>
                      {earningsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === earningsChartData.length - 1 ? 'hsl(var(--primary))' : '#e2e8f0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function ProviderProfilePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
      <ProviderProfileContent />
    </Suspense>
  );
}
