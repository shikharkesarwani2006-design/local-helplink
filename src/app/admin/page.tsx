
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, orderBy, doc, limit } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart as BarIcon, 
  Users, 
  TrendingUp, 
  Search, 
  UserCheck,
  UserX,
  History,
  Activity,
  ArrowUpRight,
  Database,
  Loader2,
  ShieldCheck,
  PieChart as PieIcon,
  Trophy,
  Star,
  LineChart as LineIcon,
  AlertCircle,
  MoreVertical,
  CheckCircle2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { cn } from "@/lib/utils";
import { seedDatabase } from "@/lib/seed-data";
import { format, startOfDay, subDays } from "date-fns";

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    if (!db || !user || !profile || profile.role !== 'admin') return null;
    return query(collection(db, "users"), orderBy("createdAt", "desc"));
  }, [db, user?.uid, profile?.role]);
  const { data: allUsers } = useCollection(usersQuery);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user || !profile || profile.role !== 'admin') return null;
    return query(collection(db, "requests"), orderBy("createdAt", "desc"));
  }, [db, user?.uid, profile?.role]);
  const { data: allRequests } = useCollection(requestsQuery);

  // Stats Calculations
  const stats = useMemo(() => {
    if (!allUsers || !allRequests) return { 
      totalUsers: 0, 
      volunteers: 0, 
      providers: 0, 
      totalRequests: 0, 
      fulfillmentRate: 0, 
      verifiedUsers: 0,
      openToday: 0
    };
    
    const completed = allRequests.filter(r => r.status === 'completed').length;
    const volunteers = allUsers.filter(u => u.role === 'volunteer').length;
    const providers = allUsers.filter(u => u.role === 'provider').length;
    
    const today = startOfDay(new Date());
    const openToday = allRequests.filter(r => 
      r.status === 'open' && 
      r.createdAt?.toDate() >= today
    ).length;

    return { 
      totalUsers: allUsers.length, 
      volunteers,
      providers,
      totalRequests: allRequests.length, 
      fulfillmentRate: allRequests.length > 0 ? (completed / allRequests.length) * 100 : 0, 
      verifiedUsers: allUsers.filter(u => u.verified).length,
      openToday
    };
  }, [allUsers, allRequests]);

  // Chart Data
  const categoryData = useMemo(() => {
    if (!allRequests) return [];
    const counts: Record<string, number> = {};
    allRequests.forEach(r => counts[r.category] = (counts[r.category] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));
  }, [allRequests]);

  const statusData = useMemo(() => {
    if (!allRequests) return [];
    const counts: Record<string, number> = { open: 0, accepted: 0, completed: 0 };
    allRequests.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return [
      { name: 'Open', value: counts.open, color: '#6366f1' },
      { name: 'Accepted', value: counts.accepted, color: '#f59e0b' },
      { name: 'Completed', value: counts.completed, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [allRequests]);

  const signupTrendData = useMemo(() => {
    if (!allUsers) return [];
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), i);
      return { date: format(date, 'MMM dd'), count: 0, rawDate: startOfDay(date) };
    }).reverse();

    allUsers.forEach(u => {
      if (!u.createdAt) return;
      const userDate = startOfDay(u.createdAt.toDate());
      const match = last30Days.find(d => d.rawDate.getTime() === userDate.getTime());
      if (match) match.count++;
    });

    return last30Days;
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allUsers, searchQuery]);

  const handleVerifyUser = (userId: string, isVerified: boolean) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "users", userId), { verified: isVerified });
    toast({ 
      title: isVerified ? "User Verified" : "Verification Revoked",
      description: `User status updated successfully.`
    });
  };

  const handleSeedData = async () => {
    if (!db) return;
    setIsSeeding(true);
    try {
      await seedDatabase(db);
      toast({ title: "Seed Complete!", description: "Sample data has been injected into the system." });
    } catch (error) {
      toast({ variant: "destructive", title: "Seed Failed", description: "Could not seed database." });
    } finally {
      setIsSeeding(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return <div className="flex h-screen items-center justify-center"><Activity className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!user || profile?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <main className="container px-6 mx-auto py-8 space-y-8">
        
        {/* Real-time Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Users className="w-16 h-16" /></div>
            <CardContent className="pt-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Growth</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.totalUsers} Members</h3>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-600 border-none">
                  {stats.volunteers} Volunteers
                </Badge>
                <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-600 border-none">
                  {stats.providers} Providers
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="w-16 h-16" /></div>
            <CardContent className="pt-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Demand</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.openToday} Open Today</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" /> Live Feed
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle2 className="w-16 h-16" /></div>
            <CardContent className="pt-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Resolved</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{allRequests?.filter(r => r.status === 'completed').length || 0} Missions</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-full">
                {stats.fulfillmentRate.toFixed(1)}% Success Rate
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck className="w-16 h-16" /></div>
            <CardContent className="pt-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Verified Members</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.verifiedUsers} Verified</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 w-fit px-2 py-0.5 rounded-full">
                {stats.totalUsers > 0 ? ((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(0) : 0}% Trust Score
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Growth Trend Line Chart */}
          <Card className="lg:col-span-8 bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <LineIcon className="w-5 h-5 text-indigo-500" /> Platform Growth
              </CardTitle>
              <CardDescription>New member signups over the last 30 days.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signupTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={{r: 4, fill: 'white', strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Impact Summary Card */}
          <Card className="lg:col-span-4 bg-primary text-white border-none shadow-xl rounded-[2rem] relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <Trophy className="w-48 h-48" />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl font-headline font-bold">Neighborhood Impact</CardTitle>
              <CardDescription className="text-primary-foreground/70">Cumulative community milestones reached.</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-6 mt-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl"><Activity className="w-5 h-5" /></div>
                <div>
                  <p className="text-xl font-bold">{allRequests?.filter(r => r.category === 'blood').length || 0} Blood Drives</p>
                  <p className="text-[10px] uppercase font-black opacity-60">Lifesaving connections</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl"><History className="w-5 h-5" /></div>
                <div>
                  <p className="text-xl font-bold">12m Avg Response</p>
                  <p className="text-[10px] uppercase font-black opacity-60">Speed of trust</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl"><Star className="w-5 h-5" /></div>
                <div>
                  <p className="text-xl font-bold">4.8 Community Rating</p>
                  <p className="text-[10px] uppercase font-black opacity-60">Average satisfaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories & Outcomes */}
        <div className="grid lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-7 bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <BarIcon className="w-5 h-5 text-primary" /> Category Demand
              </CardTitle>
              <CardDescription>Total requests per service category.</CardDescription>
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

          <Card className="lg:col-span-5 bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-secondary" /> Mission Outcomes
              </CardTitle>
              <CardDescription>Request distribution by status.</CardDescription>
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

        {/* User Management */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-2xl font-headline font-bold text-slate-800">Citizen Directory</h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-11 h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/20 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Card className="border-none shadow-sm overflow-hidden bg-white rounded-2xl">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100">
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Citizen</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Role</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Verification</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{u.name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{u.name}</span>
                          <span className="text-xs text-slate-400">{u.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize font-bold text-[10px] bg-white border-slate-200">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.verified ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase">
                          Pending
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={cn(
                          "rounded-xl font-bold gap-2",
                          u.verified ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                        )}
                        onClick={() => handleVerifyUser(u.id, !u.verified)}
                      >
                        {u.verified ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        {u.verified ? "Revoke" : "Verify"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Maintenance Actions */}
        <div className="pt-12 border-t border-dashed">
          <Card className="bg-amber-50/50 border-amber-100 shadow-none flex flex-col md:flex-row items-center justify-between p-8 rounded-[2rem] gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-amber-700 font-bold">
                <AlertCircle className="w-5 h-5" /> Maintenance Tools
              </div>
              <p className="text-sm text-amber-600/80 max-w-lg">Initialize or reset the campus database with realistic sample users and help requests for demonstration purposes.</p>
            </div>
            <Button 
              onClick={handleSeedData} 
              disabled={isSeeding} 
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 px-8 rounded-2xl gap-2 shadow-lg"
            >
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} 
              Seed Global Feed
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
