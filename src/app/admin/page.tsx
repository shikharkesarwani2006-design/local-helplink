
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, orderBy, doc } from "firebase/firestore";
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
  Star
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { cn } from "@/lib/utils";
import { seedDatabase } from "@/lib/seed-data";

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
    // Only query if the user is verified as an admin to prevent permission errors
    if (!db || !user || !profile || profile.role !== 'admin') return null;
    return query(collection(db, "users"), orderBy("createdAt", "desc"));
  }, [db, user, profile]);
  const { data: allUsers } = useCollection(usersQuery);

  const requestsQuery = useMemoFirebase(() => {
    // Only query if the user is verified as an admin to prevent permission errors
    if (!db || !user || !profile || profile.role !== 'admin') return null;
    return query(collection(db, "requests"), orderBy("createdAt", "desc"));
  }, [db, user, profile]);
  const { data: allRequests } = useCollection(requestsQuery);

  const stats = useMemo(() => {
    if (!allUsers || !allRequests) return { totalUsers: 0, totalRequests: 0, fulfillmentRate: 0, verifiedUsers: 0 };
    const completed = allRequests.filter(r => r.status === 'completed').length;
    return { 
      totalUsers: allUsers.length, 
      totalRequests: allRequests.length, 
      fulfillmentRate: allRequests.length > 0 ? (completed / allRequests.length) * 100 : 0, 
      verifiedUsers: allUsers.filter(u => u.verified).length 
    };
  }, [allUsers, allRequests]);

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

  const topHelpers = useMemo(() => {
    if (!allUsers) return [];
    return [...allUsers]
      .filter(u => u.totalHelped > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.totalHelped || 0) - (a.totalHelped || 0))
      .slice(0, 5);
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Users className="w-16 h-16" /></div>
            <CardContent className="pt-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Citizens</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.totalUsers}</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" /> Growing
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck className="w-16 h-16" /></div>
            <CardContent className="pt-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Verified Members</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.verifiedUsers}</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/5 w-fit px-2 py-0.5 rounded-full">
                {stats.totalUsers > 0 ? ((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(0) : 0}% of base
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5"><History className="w-16 h-16" /></div>
            <CardContent className="pt-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Missions</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.totalRequests}</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded-full">
                Active Feed
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-16 h-16" /></div>
            <CardContent className="pt-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fulfillment Rate</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.fulfillmentRate.toFixed(1)}%</h3>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-full">
                Target 80%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Category Bar Chart */}
          <Card className="lg:col-span-8 bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <BarIcon className="w-5 h-5 text-primary" /> Category Demand
              </CardTitle>
              <CardDescription>Total help requests per service category.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Pie Chart */}
          <Card className="lg:col-span-4 bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-secondary" /> Mission Outcomes
              </CardTitle>
              <CardDescription>Distribution of request statuses.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex flex-col justify-center">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: s.color}} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{s.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics & Top Helpers Row */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Top Helpers List */}
          <Card className="lg:col-span-5 bg-white border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> Elite Helpers
              </CardTitle>
              <CardDescription>Most impactful neighbors based on ratings.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {topHelpers.map((h, idx) => (
                  <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-300 w-4">{idx + 1}</span>
                      <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${h.email}`} />
                        <AvatarFallback className="bg-primary/10 text-primary">{h.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{h.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                          {h.totalHelped} Missions Completed
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-amber-700">{h.rating?.toFixed(1) || '5.0'}</span>
                    </div>
                  </div>
                ))}
                {topHelpers.length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                    <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">No helpers found yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Quick Actions */}
          <Card className="lg:col-span-7 bg-white border-none shadow-sm flex flex-col justify-center items-center text-center p-8 space-y-6">
            <div className="bg-primary/10 p-6 rounded-[2.5rem]">
              <Database className="w-12 h-12 text-primary" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-bold">System Maintenance</h3>
              <p className="text-sm text-slate-500">Inject sample missions and users to test community dynamics and verify analytics calculations.</p>
            </div>
            <Button 
              onClick={handleSeedData} 
              disabled={isSeeding} 
              className="w-full max-w-xs bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-2xl gap-2 shadow-lg shadow-slate-900/10"
            >
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} 
              Generate Test Population
            </Button>
          </Card>
        </div>

        {/* User Management Table */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-2xl font-headline font-bold text-slate-800">Citizen Directory</h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search citizens..." 
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
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-400 h-14">Citizen</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-400 h-14">Role</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-400 h-14">Impact</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-400 h-14 text-center">Status</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-400 h-14 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{u.name[0]}</AvatarFallback>
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
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold text-sm">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {u.rating?.toFixed(1) || '5.0'}
                        <span className="text-slate-300 mx-1">|</span>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> {u.totalHelped || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
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
      </main>
    </div>
  );
}
