
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  query, 
  collection, 
  doc, 
  where
} from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Activity, 
  CheckCircle2, 
  ShieldCheck, 
  Zap,
  Wrench,
  AlertCircle,
  Trophy,
  Star,
  Clock,
  UserPlus,
  PlusCircle,
  Loader2,
  List,
  ArrowRight,
  ShieldAlert,
  FileText,
  BarChart3
} from "lucide-react";
import { format, startOfDay, subDays, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const [liveStats, setLiveStats] = useState({
    totalUsers: 0,
    volunteers: 0,
    providers: 0,
    openRequests: 0,
    requestsToday: 0,
    completedThisWeek: 0,
    pendingVerifications: 0,
    activeJobs: 0,
    healthScore: 98
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  // Real-time collections for global analytics
  const usersQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "users"));
  }, [db, profile?.role]);
  const { data: rawUsers } = useCollection(usersQuery);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "requests"));
  }, [db, profile?.role]);
  const { data: rawRequests } = useCollection(requestsQuery);

  const ratingsQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "ratings"));
  }, [db, profile?.role]);
  const { data: rawRatings } = useCollection(ratingsQuery);

  // SORT AND FILTER IN JS
  const allUsers = useMemo(() => {
    if (!rawUsers) return [];
    return [...rawUsers].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawUsers]);

  const allRequests = useMemo(() => {
    if (!rawRequests) return [];
    return [...rawRequests].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawRequests]);

  // Update stats from memory
  useEffect(() => {
    if (!allUsers || !allRequests || profile?.role !== 'admin') return;

    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(new Date(), 7);

    const requestsToday = allRequests.filter(r => 
      r.createdAt && r.createdAt.toDate() >= today
    ).length;

    const completedThisWeek = allRequests.filter(r => 
      r.status === 'completed' && 
      r.completedAt && 
      r.completedAt.toDate() >= sevenDaysAgo
    ).length;

    const pendingVerifications = allUsers.filter(u => 
      u.role === 'provider' && u.verified === false
    ).length;

    setLiveStats({
      totalUsers: allUsers.length,
      volunteers: allUsers.filter(u => u.role === 'volunteer').length,
      providers: allUsers.filter(u => u.role === 'provider').length,
      openRequests: allRequests.filter(r => r.status === 'open').length,
      requestsToday,
      activeJobs: allRequests.filter(r => r.status === 'accepted').length,
      completedThisWeek,
      pendingVerifications,
      healthScore: 98 // Simulated platform metric
    });
  }, [allUsers, allRequests, profile?.role]);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push("/dashboard");
      }
    }
  }, [user, profile, isUserLoading, isProfileLoading, router]);

  // Unified Live Activity Feed
  const activityEvents = useMemo(() => {
    const events: any[] = [];

    allRequests?.slice(0, 15).forEach(r => {
      events.push({
        id: `req-${r.id}`,
        type: 'request',
        icon: <PlusCircle className="w-4 h-4 text-primary" />,
        text: `New request posted: "${r.title}"`,
        area: r.location?.area || "Campus",
        time: r.createdAt?.toDate() || new Date(),
        link: "/admin/requests"
      });
      if (r.status === 'completed' && r.completedAt) {
        events.push({
          id: `done-${r.id}`,
          type: 'resolved',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
          text: `Request resolved: "${r.title}"`,
          area: r.location?.area || "Campus",
          time: r.completedAt.toDate(),
          link: "/admin/requests"
        });
      }
    });

    allUsers?.slice(0, 10).forEach(u => {
      events.push({
        id: `user-${u.id}`,
        type: 'user',
        icon: <UserPlus className="w-4 h-4 text-blue-500" />,
        text: `New citizen registered: ${u.name}`,
        area: u.location?.area || "Joined Hub",
        time: u.createdAt?.toDate() || new Date(),
        link: "/admin/users"
      });
      if (u.role === 'provider' && !u.verified) {
        events.push({
          id: `verify-${u.id}`,
          type: 'verification',
          icon: <ShieldAlert className="w-4 h-4 text-orange-500" />,
          text: `Verification submitted by ${u.name}`,
          area: u.serviceCategory || "Expert",
          time: u.createdAt?.toDate() || new Date(),
          link: "/admin/verifications"
        });
      }
    });

    return events.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);
  }, [allRequests, allUsers]);

  if (isUserLoading || isProfileLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#0A0F1E]"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!user || profile?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-50 pb-20">
      {/* 🚀 ADMIN HERO BANNER */}
      <section className="bg-gradient-to-br from-[#1E1B4B] to-[#0A0F1E] pt-12 pb-24 px-6 relative overflow-hidden border-b border-white/5">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="container mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/30">
              <ShieldCheck className="w-3.5 h-3.5" /> System Administrator
            </div>
            <h1 className="text-4xl md:text-6xl font-headline font-bold text-white tracking-tight">Admin Control Center</h1>
            <p className="text-slate-400 text-lg font-medium max-w-xl">Manage citizens, verify helpers, and monitor platform health across the campus network.</p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              size="lg" 
              className="h-14 px-8 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-2xl shadow-primary/20"
              onClick={() => router.push('/admin/verifications')}
            >
              Review Pending Verifications <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-14 px-8 border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold rounded-2xl"
              onClick={() => router.push('/admin/requests')}
            >
              View All Requests
            </Button>
          </div>
        </div>
      </section>

      <main className="container px-6 mx-auto -mt-12 relative z-20 space-y-10">
        {/* 📊 ADMIN STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-[#1A1F35] border-none shadow-xl p-5 group hover:bg-[#232946] transition-colors">
            <div className="bg-blue-500/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Citizens</p>
            <h3 className="text-2xl font-black mt-1">{liveStats.totalUsers}</h3>
          </Card>
          <Card className="bg-[#1A1F35] border-none shadow-xl p-5 group hover:bg-[#232946] transition-colors">
            <div className="bg-indigo-500/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <List className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Requests Today</p>
            <h3 className="text-2xl font-black mt-1">{liveStats.requestsToday}</h3>
          </Card>
          <Card className={cn(
            "bg-[#1A1F35] border-none shadow-xl p-5 group hover:bg-[#232946] transition-colors",
            liveStats.pendingVerifications > 0 && "ring-2 ring-orange-500/50"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",
              liveStats.pendingVerifications > 0 ? "bg-orange-500/20" : "bg-emerald-500/20"
            )}>
              <ShieldCheck className={cn("w-5 h-5", liveStats.pendingVerifications > 0 ? "text-orange-400" : "text-emerald-400")} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Verif.</p>
            <h3 className={cn("text-2xl font-black mt-1", liveStats.pendingVerifications > 0 ? "text-orange-400" : "text-white")}>
              {liveStats.pendingVerifications}
            </h3>
          </Card>
          <Card className="bg-[#1A1F35] border-none shadow-xl p-5 group hover:bg-[#232946] transition-colors">
            <div className="bg-amber-500/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Wrench className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Providers</p>
            <h3 className="text-2xl font-black mt-1">{liveStats.providers}</h3>
          </Card>
          <Card className="bg-[#1A1F35] border-none shadow-xl p-5 group hover:bg-[#232946] transition-colors">
            <div className="bg-emerald-500/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resolved (Week)</p>
            <h3 className="text-2xl font-black mt-1">{liveStats.completedThisWeek}</h3>
          </Card>
          <Card className="bg-[#1A1F35] border-none shadow-xl p-5 group hover:bg-[#232946] transition-colors">
            <div className="bg-rose-500/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5 text-rose-400" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Health Score</p>
            <h3 className="text-2xl font-black mt-1 text-emerald-400">{liveStats.healthScore}%</h3>
          </Card>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* 📜 RECENT ACTIVITY FEED */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-3">
                <Activity className="w-6 h-6 text-primary" /> Live Activity Feed
              </h2>
              <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 animate-pulse">Real-time Sync</Badge>
            </div>
            <Card className="bg-[#1A1F35] border-none shadow-xl rounded-[2rem] overflow-hidden">
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-white/5">
                  {activityEvents.map((event) => (
                    <div key={event.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {event.icon}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-slate-200">{event.text}</p>
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{event.area}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                          {formatDistanceToNow(event.time)} ago
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 rounded-lg text-primary hover:bg-primary/10 font-bold px-4"
                          onClick={() => router.push(event.link)}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* ⚡ QUICK ADMIN ACTIONS */}
          <div className="lg:col-span-4 space-y-6">
            <h2 className="text-2xl font-headline font-bold flex items-center gap-3">
              <Zap className="w-6 h-6 text-amber-400" /> Command Panel
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => router.push('/admin/verifications')}
                className="bg-[#1A1F35] p-6 rounded-3xl text-center space-y-3 hover:bg-[#232946] transition-all border border-white/5 active:scale-95 group"
              >
                <div className="relative inline-block">
                  <ShieldCheck className="w-8 h-8 text-orange-400 mx-auto" />
                  {liveStats.pendingVerifications > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[8px] font-black text-white ring-2 ring-[#1A1F35]">
                      {liveStats.pendingVerifications}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Verify Experts</p>
              </button>
              <button 
                onClick={() => router.push('/admin/requests')}
                className="bg-[#1A1F35] p-6 rounded-3xl text-center space-y-3 hover:bg-[#232946] transition-all border border-white/5 active:scale-95"
              >
                <List className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">All Requests</p>
              </button>
              <button 
                onClick={() => router.push('/admin/users')}
                className="bg-[#1A1F35] p-6 rounded-3xl text-center space-y-3 hover:bg-[#232946] transition-all border border-white/5 active:scale-95"
              >
                <Users className="w-8 h-8 text-blue-400 mx-auto" />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Citizens</p>
              </button>
              <button 
                onClick={() => router.push('/admin/providers')}
                className="bg-[#1A1F35] p-6 rounded-3xl text-center space-y-3 hover:bg-[#232946] transition-all border border-white/5 active:scale-95"
              >
                <Wrench className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Providers</p>
              </button>
              <button 
                onClick={() => router.push('/admin/announcements')}
                className="bg-[#1A1F35] p-6 rounded-3xl text-center space-y-3 hover:bg-[#232946] transition-all border border-white/5 active:scale-95"
              >
                <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Emergency</p>
              </button>
              <button className="bg-[#1A1F35] p-6 rounded-3xl text-center space-y-3 hover:bg-[#232946] transition-all border border-white/5 active:scale-95">
                <FileText className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Export Data</p>
              </button>
            </div>

            <Card className="bg-primary/5 border border-primary/10 rounded-[2rem] p-8 space-y-4">
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                <h4 className="font-bold text-lg">Admin Status</h4>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">Your current community standing based on system contributions.</p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-3xl font-black text-white">{profile?.rating?.toFixed(1) || "5.0"}</span>
                <Badge className="bg-primary/20 text-primary border-none font-bold">TOP TIER</Badge>
              </div>
            </Card>
          </div>
        </div>

        {/* 📋 REQUESTS OVERVIEW TABLE */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-headline font-bold">Incoming Platform Missions</h2>
            <Button variant="link" className="text-primary font-bold" onClick={() => router.push('/admin/requests')}>View All Missions →</Button>
          </div>
          <Card className="bg-[#1A1F35] border-none shadow-xl rounded-[2rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-8 py-4">Type</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Posted By</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allRequests.slice(0, 5).map((req) => (
                    <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-5">
                        <Badge className={cn(
                          "uppercase text-[9px] font-black h-5",
                          req.urgency === 'high' ? "bg-rose-500 text-white" : "bg-blue-500/20 text-blue-400 border-none"
                        )}>
                          {req.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        <p className="text-sm font-bold text-slate-200 truncate">{req.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{format(req.createdAt?.toDate() || new Date(), 'MMM dd, HH:mm')}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[8px] font-bold">{req.postedByName?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-bold text-slate-300">{req.postedByName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs text-slate-400 font-medium">{req.location?.area}</td>
                      <td className="px-6 py-5">
                        <Badge className={cn(
                          "text-[9px] font-black uppercase h-5",
                          req.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" : 
                          req.status === 'accepted' ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                        )}>
                          {req.status}
                        </Badge>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 rounded-lg text-primary hover:bg-primary/10 font-bold px-4"
                          onClick={() => router.push('/admin/requests')}
                        >
                          Moderate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* 🛡️ PENDING VERIFICATIONS WIDGET */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-headline font-bold flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-500" /> Pending Expert Verifications
            </h2>
            <Button variant="link" className="text-primary font-bold" onClick={() => router.push('/admin/verifications')}>View All Pending →</Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {allUsers.filter(u => u.role === 'provider' && !u.verified).slice(0, 3).map((provider) => (
              <Card key={provider.id} className="bg-[#1A1F35] border-none shadow-xl rounded-[2rem] p-6 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Wrench className="w-20 h-20" />
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <Avatar className="h-12 w-12 border-2 border-white/10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${provider.email}`} />
                    <AvatarFallback>{provider.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-slate-200">{provider.name}</h4>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{provider.serviceCategory}</p>
                  </div>
                </div>
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                    <span>Experience</span>
                    <span className="text-slate-200">{provider.experience || "Entry"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                    <span>Applied</span>
                    <span className="text-slate-200">{format(provider.createdAt?.toDate() || new Date(), 'MMM dd')}</span>
                  </div>
                </div>
                <div className="flex gap-2 relative z-10">
                  <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-10 rounded-xl" onClick={() => router.push('/admin/verifications')}>Approve</Button>
                  <Button variant="outline" className="flex-1 border-white/10 bg-white/5 text-rose-400 hover:bg-rose-500/10 font-bold h-10 rounded-xl" onClick={() => router.push('/admin/verifications')}>Reject</Button>
                </div>
              </Card>
            ))}
            {allUsers.filter(u => u.role === 'provider' && !u.verified).length === 0 && (
              <div className="col-span-3 py-16 text-center bg-white/5 rounded-[2rem] border-2 border-dashed border-white/5">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/20 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">All expert applications have been processed.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

import { ScrollArea } from "@/components/ui/scroll-area";
