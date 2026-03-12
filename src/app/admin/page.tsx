
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  query, 
  collection, 
  orderBy, 
  doc, 
  getCountFromServer, 
  where, 
  getAggregateFromServer, 
  average, 
  Timestamp,
  limit
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
  BarChart as BarIcon, 
  LineChart as LineIcon, 
  PieChart as PieIcon,
  TrendingUp,
  ArrowUpRight,
  Zap,
  Droplets,
  BookOpen,
  Wrench,
  AlertCircle,
  Trophy,
  Star,
  Clock,
  Briefcase,
  UserPlus,
  PlusCircle,
  Loader2,
  MessageSquare
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
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
    completedThisWeek: 0,
    pendingVerifications: 0,
    activeJobs: 0,
    avgRating: 5.0
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const fetchStats = useCallback(async () => {
    if (!db || profile?.role !== 'admin') return;

    try {
      const usersCol = collection(db, "users");
      const requestsCol = collection(db, "requests");
      const sevenDaysAgo = subDays(new Date(), 7);

      const [
        totalUsersSnap,
        volunteersSnap,
        providersSnap,
        openRequestsSnap,
        completedThisWeekSnap,
        pendingVerificationsSnap,
        activeJobsSnap,
        avgRatingSnap
      ] = await Promise.all([
        getCountFromServer(usersCol),
        getCountFromServer(query(usersCol, where("role", "==", "volunteer"))),
        getCountFromServer(query(usersCol, where("role", "==", "provider"))),
        getCountFromServer(query(requestsCol, where("status", "==", "open"))),
        getCountFromServer(query(requestsCol, where("status", "==", "completed"), where("completedAt", ">=", Timestamp.fromDate(sevenDaysAgo)))),
        getCountFromServer(query(usersCol, where("role", "==", "provider"), where("verified", "==", false))),
        getCountFromServer(query(requestsCol, where("status", "==", "accepted"))),
        getAggregateFromServer(usersCol, { avg: average("rating") })
      ]);

      setLiveStats({
        totalUsers: totalUsersSnap.data().count,
        volunteers: volunteersSnap.data().count,
        providers: providersSnap.data().count,
        openRequests: openRequestsSnap.data().count,
        completedThisWeek: completedThisWeekSnap.data().count,
        pendingVerifications: pendingVerificationsSnap.data().count,
        activeJobs: activeJobsSnap.data().count,
        avgRating: avgRatingSnap.data().avg || 5.0
      });
    } catch (e) {
      console.error("Failed to fetch admin stats:", e);
    }
  }, [db, profile?.role]);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push("/dashboard");
      } else {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [user, profile, isUserLoading, isProfileLoading, router, fetchStats]);

  // Real-time listeners for analytics
  const usersQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "users"), orderBy("createdAt", "desc"), limit(50));
  }, [db, profile?.role]);
  const { data: allUsers } = useCollection(usersQuery);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "requests"), orderBy("createdAt", "desc"), limit(50));
  }, [db, profile?.role]);
  const { data: allRequests } = useCollection(requestsQuery);

  const ratingsQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "ratings"), orderBy("createdAt", "desc"), limit(10));
  }, [db, profile?.role]);
  const { data: recentRatings } = useCollection(ratingsQuery);

  // CHART 1: Requests by Category
  const categoryData = useMemo(() => {
    if (!allRequests) return [];
    const counts: Record<string, { count: number, color: string }> = { 
      blood: { count: 0, color: '#ef4444' }, 
      tutor: { count: 0, color: '#3b82f6' }, 
      repair: { count: 0, color: '#f59e0b' }, 
      emergency: { count: 0, color: '#8b5cf6' }, 
      other: { count: 0, color: '#94a3b8' } 
    };
    allRequests.forEach(r => {
      if (counts[r.category]) counts[r.category].count++;
      else counts.other.count++;
    });
    return Object.entries(counts).map(([name, data]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value: data.count,
      fill: data.color
    }));
  }, [allRequests]);

  // CHART 2: Request Status Breakdown
  const statusData = useMemo(() => {
    if (!allRequests) return [];
    const counts: Record<string, number> = { open: 0, accepted: 0, completed: 0, expired: 0 };
    allRequests.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return [
      { name: 'Open', value: counts.open, color: '#3b82f6' },
      { name: 'Accepted', value: counts.accepted, color: '#f59e0b' },
      { name: 'Completed', value: counts.completed, color: '#10b981' },
      { name: 'Expired', value: counts.expired, color: '#94a3b8' }
    ].filter(d => d.value > 0);
  }, [allRequests]);

  // CHART 3: New Users Trend
  const signupTrendData = useMemo(() => {
    if (!allUsers) return [];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return { date: format(date, 'EEE'), count: 0, rawDate: startOfDay(date) };
    }).reverse();

    allUsers.forEach(u => {
      if (!u.createdAt) return;
      const userDate = startOfDay(u.createdAt.toDate());
      const match = last7Days.find(d => d.rawDate.getTime() === userDate.getTime());
      if (match) match.count++;
    });

    return last7Days;
  }, [allUsers]);

  // Unified Live Activity Feed
  const activityEvents = useMemo(() => {
    const events: any[] = [];

    allRequests?.forEach(r => {
      events.push({
        id: `req-${r.id}`,
        type: 'request',
        icon: <PlusCircle className="w-4 h-4 text-primary" />,
        text: `${r.postedByName || 'Someone'} posted a ${r.category} request`,
        time: r.createdAt?.toDate() || new Date(),
        subtext: r.title
      });
      if (r.status === 'accepted' && r.acceptedAt) {
        events.push({
          id: `acc-${r.id}`,
          type: 'accepted',
          icon: <CheckCircle2 className="w-4 h-4 text-amber-500" />,
          text: `A volunteer accepted: ${r.title}`,
          time: r.acceptedAt.toDate()
        });
      }
    });

    allUsers?.forEach(u => {
      events.push({
        id: `user-${u.id}`,
        type: 'user',
        icon: <UserPlus className="w-4 h-4 text-blue-500" />,
        text: `New user joined: ${u.name}`,
        time: u.createdAt?.toDate() || new Date(),
        subtext: u.email
      });
    });

    recentRatings?.forEach(rat => {
      events.push({
        id: `rat-${rat.id}`,
        type: 'rating',
        icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />,
        text: `Provider received a ${rat.score}★ rating`,
        time: rat.createdAt?.toDate() || new Date(),
        subtext: rat.comment
      });
    });

    return events.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);
  }, [allRequests, allUsers, recentRatings]);

  if (isUserLoading || isProfileLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!user || profile?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <main className="container px-6 mx-auto py-8 space-y-8">
        
        {/* Real-time Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <Card className="border-none shadow-sm bg-white overflow-hidden p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Citizens</p>
            <h3 className="text-xl font-bold mt-1">{liveStats.totalUsers}</h3>
            <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-full">
              <Users className="w-3 h-3" /> Citizens
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volunteers</p>
            <h3 className="text-xl font-bold mt-1">{liveStats.volunteers}</h3>
            <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-purple-600 bg-purple-50 w-fit px-2 py-0.5 rounded-full">
              <Trophy className="w-3 h-3" /> Helpers
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Providers</p>
            <h3 className="text-xl font-bold mt-1">{liveStats.providers}</h3>
            <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded-full">
              <Wrench className="w-3 h-3" /> Experts
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open Needs</p>
            <h3 className="text-xl font-bold mt-1">{liveStats.openRequests}</h3>
            <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 w-fit px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" /> Demand
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weekly Wins</p>
            <h3 className="text-xl font-bold mt-1">{liveStats.completedThisWeek}</h3>
            <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Impact
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
            <h3 className="text-xl font-bold mt-1">{liveStats.pendingVerifications}</h3>
            <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 w-fit px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" /> Review
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Jobs</p>
            <h3 className="text-xl font-bold mt-1">{liveStats.activeJobs}</h3>
            <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 w-fit px-2 py-0.5 rounded-full">
              <Activity className="w-3 h-3" /> Ongoing
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Rating</p>
            <h3 className="text-xl font-bold mt-1">{liveStats.avgRating.toFixed(1)}</h3>
            <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded-full">
              <Star className="w-3 h-3 fill-amber-600" /> Quality
            </div>
          </Card>
        </div>

        {/* ROW 1: ANALYTICS CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="bg-white border-none shadow-sm rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-headline font-bold flex items-center gap-2">
                <BarIcon className="w-4 h-4 text-primary" /> Requests by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-headline font-bold flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-secondary" /> Request Status
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie data={statusData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}} />
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{s.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-headline font-bold flex items-center gap-2">
                <LineIcon className="w-4 h-4 text-indigo-500" /> New Users (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signupTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={5} />
                  <YAxis hide />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={{r: 4, fill: 'white', strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ROW 2: LIVE ACTIVITY FEED */}
        <Card className="bg-white border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" /> Live Activity Feed
                </CardTitle>
                <CardDescription>Real-time platform events and system triggers.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 h-8 px-4 font-bold rounded-xl animate-pulse">
                Live Syncing
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y border-t">
              {activityEvents.length === 0 ? (
                <div className="py-20 text-center text-slate-400">No activity yet.</div>
              ) : (
                activityEvents.map((event) => (
                  <div key={event.id} className="px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {event.icon}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-900 leading-snug">{event.text}</p>
                        {event.subtext && <p className="text-xs text-slate-400 font-medium italic">"{event.subtext}"</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        <Clock className="w-3 h-3" /> {formatDistanceToNow(event.time)} ago
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Data Tables */}
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
