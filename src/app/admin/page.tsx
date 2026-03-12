
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, orderBy, doc, limit } from "firebase/firestore";
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
  BarChart as BarIcon, 
  LineChart as LineIcon, 
  PieChart as PieIcon,
  TrendingUp,
  History,
  ArrowUpRight,
  Zap,
  Droplets,
  BookOpen,
  Wrench,
  AlertCircle,
  Trophy
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { format, startOfDay, subDays, isSameWeek } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push("/dashboard");
      }
    }
  }, [user, profile, isUserLoading, isProfileLoading, router]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "users"), orderBy("createdAt", "desc"));
  }, [db, profile?.role]);
  const { data: allUsers } = useCollection(usersQuery);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "requests"), orderBy("createdAt", "desc"));
  }, [db, profile?.role]);
  const { data: allRequests } = useCollection(requestsQuery);

  // Stats Calculations
  const stats = useMemo(() => {
    if (!allUsers || !allRequests) return { 
      totalUsers: 0, 
      volunteers: 0, 
      providers: 0, 
      openRequests: 0, 
      completedThisWeek: 0,
      pendingVerifications: 0
    };
    
    const volunteers = allUsers.filter(u => u.role === 'volunteer').length;
    const providers = allUsers.filter(u => u.role === 'provider').length;
    const openRequests = allRequests.filter(r => r.status === 'open').length;
    const pendingVerifications = allUsers.filter(u => u.role === 'provider' && !u.verified).length;
    
    const now = new Date();
    const completedThisWeek = allRequests.filter(r => 
      r.status === 'completed' && 
      r.completedAt && 
      isSameWeek(r.completedAt.toDate(), now)
    ).length;

    return { 
      totalUsers: allUsers.length, 
      volunteers,
      providers,
      openRequests,
      completedThisWeek,
      pendingVerifications
    };
  }, [allUsers, allRequests]);

  // Chart Data
  const categoryData = useMemo(() => {
    if (!allRequests) return [];
    const counts: Record<string, number> = { blood: 0, tutor: 0, repair: 0, emergency: 0, other: 0 };
    allRequests.forEach(r => counts[r.category] = (counts[r.category] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));
  }, [allRequests]);

  const statusData = useMemo(() => {
    if (!allRequests) return [];
    const counts: Record<string, number> = { open: 0, accepted: 0, completed: 0, expired: 0 };
    allRequests.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return [
      { name: 'Open', value: counts.open, color: '#6366f1' },
      { name: 'Accepted', value: counts.accepted, color: '#f59e0b' },
      { name: 'Completed', value: counts.completed, color: '#10b981' },
      { name: 'Expired', value: counts.expired, color: '#94a3b8' }
    ].filter(d => d.value > 0);
  }, [allRequests]);

  const signupTrendData = useMemo(() => {
    if (!allUsers) return [];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return { date: format(date, 'MMM dd'), count: 0, rawDate: startOfDay(date) };
    }).reverse();

    allUsers.forEach(u => {
      if (!u.createdAt) return;
      const userDate = startOfDay(u.createdAt.toDate());
      const match = last7Days.find(d => d.rawDate.getTime() === userDate.getTime());
      if (match) match.count++;
    });

    return last7Days;
  }, [allUsers]);

  const impactMetrics = useMemo(() => {
    if (!allRequests) return { resolved: 0, blood: 0, tutor: 0, repair: 0 };
    const completed = allRequests.filter(r => r.status === 'completed');
    return {
      resolved: completed.length,
      blood: completed.filter(r => r.category === 'blood').length,
      tutor: completed.filter(r => r.category === 'tutor').length,
      repair: completed.filter(r => r.category === 'repair').length,
    };
  }, [allRequests]);

  if (isUserLoading || isProfileLoading) {
    return <div className="flex h-screen items-center justify-center"><Activity className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!user || profile?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <main className="container px-6 mx-auto py-8 space-y-8">
        
        {/* Real-time Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Citizens</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.totalUsers}</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-full">
                <Users className="w-3 h-3" /> Growth
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volunteers</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.volunteers}</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 w-fit px-2 py-0.5 rounded-full">
                <Trophy className="w-3 h-3" /> Impact
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Providers</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.providers}</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded-full">
                <Wrench className="w-3 h-3" /> Services
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open Needs</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.openRequests}</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" /> Demand
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Success/Wk</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.completedThisWeek}</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 w-fit px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Weekly
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.pendingVerifications}</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 w-fit px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Auth
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-8 bg-white border-none shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <LineIcon className="w-5 h-5 text-indigo-500" /> Member Signups (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signupTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={{r: 4, fill: 'white', strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 bg-primary text-white border-none shadow-xl rounded-[2.5rem] relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <Trophy className="w-48 h-48" />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl font-headline font-bold">Campus Impact</CardTitle>
              <CardDescription className="text-primary-foreground/70">Cumulative community milestones.</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-6 mt-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl"><Droplets className="w-5 h-5" /></div>
                <div>
                  <p className="text-xl font-bold">{impactMetrics.blood} Blood Drives</p>
                  <p className="text-[10px] uppercase font-black opacity-60">Lifesaving connections</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl"><BookOpen className="w-5 h-5" /></div>
                <div>
                  <p className="text-xl font-bold">{impactMetrics.tutor} Study Sessions</p>
                  <p className="text-[10px] uppercase font-black opacity-60">Academic support</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl"><Wrench className="w-5 h-5" /></div>
                <div>
                  <p className="text-xl font-bold">{impactMetrics.repair} Expert Repairs</p>
                  <p className="text-[10px] uppercase font-black opacity-60">Technical resolution</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-7 bg-white border-none shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <BarIcon className="w-5 h-5 text-primary" /> Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px'}} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-5 bg-white border-none shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-secondary" /> Mission Outcomes
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] flex flex-col items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{s.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="bg-white border-none shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold">Recent Registrations</CardTitle>
                <CardDescription>Latest community members</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary font-bold" onClick={() => router.push('/admin/users')}>View All</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {allUsers?.slice(0, 5).map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} />
                      <AvatarFallback>{u.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{u.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{u.role}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-400">
                    {u.createdAt ? format(u.createdAt.toDate(), 'MMM dd') : 'Recent'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold">Incoming Requests</CardTitle>
                <CardDescription>Live community feed</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary font-bold" onClick={() => router.push('/admin/requests')}>View All</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {allRequests?.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-2 h-8 rounded-full shrink-0",
                      r.urgency === 'high' ? "bg-red-500" : r.urgency === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{r.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{r.category} • {r.status}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-400 shrink-0">
                    {r.createdAt ? format(r.createdAt.toDate(), 'HH:mm') : 'Now'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
