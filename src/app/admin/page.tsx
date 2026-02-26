"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, orderBy, where, doc, Timestamp } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart as BarIcon, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  ShieldAlert, 
  Search, 
  MoreHorizontal,
  UserCheck,
  UserX,
  History,
  Activity,
  ArrowUpRight,
  PieChart as PieIcon,
  Database,
  Loader2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from "recharts";
import { format } from "date-fns";
import { seedDatabase } from "@/lib/seed-data";

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isSeeding, setIsSeeding] = useState(false);

  // 1. Access Control
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

  // 2. Data Fetching - Gated by Admin Role
  const usersQuery = useMemoFirebase(() => {
    if (!db || !user || profile?.role !== 'admin') return null;
    return query(collection(db, "users"), orderBy("createdAt", "desc"));
  }, [db, user, profile?.role]);
  const { data: allUsers } = useCollection(usersQuery);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user || profile?.role !== 'admin') return null;
    return query(collection(db, "requests"), orderBy("createdAt", "desc"));
  }, [db, user, profile?.role]);
  const { data: allRequests } = useCollection(requestsQuery);

  const [searchQuery, setSearchQuery] = useState("");

  // 3. Analytics Calculations
  const stats = useMemo(() => {
    if (!allUsers || !allRequests) return { totalUsers: 0, totalRequests: 0, fulfillmentRate: 0, activeVolunteers: 0 };
    
    const totalUsers = allUsers.length;
    const totalRequests = allRequests.length;
    const completedRequests = allRequests.filter(r => r.status === 'completed').length;
    const fulfillmentRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
    const activeVolunteers = allUsers.filter(u => u.role === 'volunteer' && u.totalHelped > 0).length;

    return { totalUsers, totalRequests, fulfillmentRate, activeVolunteers };
  }, [allUsers, allRequests]);

  const categoryData = useMemo(() => {
    if (!allRequests) return [];
    const counts: Record<string, number> = {};
    allRequests.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [allRequests]);

  const statusData = useMemo(() => {
    if (!allRequests) return [];
    const counts: Record<string, number> = {};
    allRequests.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [allRequests]);

  const COLORS = ['#A7D1AB', '#78B0B5', '#FF8042', '#0088FE', '#FFBB28'];

  // 4. Handlers
  const handleVerifyUser = (userId: string, isVerified: boolean) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "users", userId), { verified: isVerified });
    toast({ title: isVerified ? "User Verified" : "Verification Removed" });
  };

  const handleSeedData = async () => {
    if (!db) return;
    setIsSeeding(true);
    try {
      await seedDatabase(db);
      toast({
        title: "Seed Complete!",
        description: "Local community has been populated with sample citizens and missions.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Seed Failed",
        description: "Could not populate sample data.",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allUsers, searchQuery]);

  const isDatabaseEmpty = !allUsers || allUsers.length <= 1; // 1 is the admin themselves

  if (isUserLoading || isProfileLoading || profile?.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Activity className="animate-spin h-8 w-8 text-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <Navbar />
      
      <header className="bg-white border-b py-8 sticky top-16 z-30 shadow-sm">
        <div className="container px-6 mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-secondary">System Oversight</h1>
            <p className="text-slate-500">Global community metrics and governance</p>
          </div>
          <div className="flex gap-3">
            {isDatabaseEmpty && (
              <Button 
                onClick={handleSeedData} 
                disabled={isSeeding}
                className="bg-primary hover:bg-primary/90 text-white gap-2"
              >
                {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Seed Sample Data
              </Button>
            )}
            <Button variant="outline" className="gap-2">
              <History className="w-4 h-4" /> Export logs
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto mt-8 space-y-8">
        {/* STATS STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Citizens</p>
                  <h3 className="text-3xl font-bold mt-1">{stats.totalUsers}</h3>
                </div>
                <div className="bg-primary/10 p-2 rounded-xl"><Users className="text-primary w-5 h-5" /></div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-emerald-500 text-xs font-bold">
                <ArrowUpRight className="w-3 h-3" /> Growth tracked live
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
                  <h3 className="text-3xl font-bold mt-1">{stats.totalRequests}</h3>
                </div>
                <div className="bg-secondary/10 p-2 rounded-xl"><BarIcon className="text-secondary w-5 h-5" /></div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-slate-400 text-xs font-bold">
                <Activity className="w-3 h-3" /> System activity pulse
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fulfillment</p>
                  <h3 className="text-3xl font-bold mt-1">{stats.fulfillmentRate.toFixed(1)}%</h3>
                </div>
                <div className="bg-amber-100/50 p-2 rounded-xl"><CheckCircle2 className="text-amber-500 w-5 h-5" /></div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-amber-500 text-xs font-bold">
                <TrendingUp className="w-3 h-3" /> Community resolution rate
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Helpers</p>
                  <h3 className="text-3xl font-bold mt-1">{stats.activeVolunteers}</h3>
                </div>
                <div className="bg-emerald-100/50 p-2 rounded-xl"><UserCheck className="text-emerald-500 w-5 h-5" /></div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-emerald-500 text-xs font-bold">
                Verified community members
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CHARTS */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-headline">Need Categories</CardTitle>
              <CardDescription>Breakdown of help requests by type</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" fill="#78B0B5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-headline">Status Distribution</CardTitle>
              <CardDescription>Current lifecycle of community requests</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* MANAGEMENT TABLES */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-white p-1 h-14 border shadow-sm rounded-2xl w-full md:w-auto grid grid-cols-2 mb-6">
            <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-secondary data-[state=active]:text-white gap-2 font-bold px-8 h-10">
              <Users className="w-4 h-4" /> User Base
            </TabsTrigger>
            <TabsTrigger value="moderation" className="rounded-xl data-[state=active]:bg-secondary data-[state=active]:text-white gap-2 font-bold px-8 h-10">
              <AlertCircle className="w-4 h-4" /> Moderation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <CardTitle className="text-xl font-headline">Citizens Management</CardTitle>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search name or email..." 
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Citizen</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Help Count</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${u.email}`} />
                              <AvatarFallback>{u.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{u.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{u.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize bg-white">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.verified ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </Badge>
                          ) : (
                            <Badge variant="ghost" className="text-slate-400 border border-slate-200">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-600">{u.totalHelped || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-bold text-amber-600 text-xs">
                             ★ {u.rating?.toFixed(1) || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className={u.verified ? "text-red-500" : "text-emerald-500"}
                              onClick={() => handleVerifyUser(u.id, !u.verified)}
                            >
                              {u.verified ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderation">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-headline">Reported Activity</CardTitle>
                    <CardDescription>Content flagged by the community for review</CardDescription>
                  </CardHeader>
                  <CardContent className="h-96 flex flex-col items-center justify-center text-center p-12">
                    <div className="bg-emerald-50 p-6 rounded-full mb-4">
                       <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">All Clear!</h3>
                    <p className="text-slate-400 text-sm max-w-xs mt-2">There are currently no reported help requests awaiting moderation.</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                 <Card className="border-none shadow-sm bg-secondary text-white">
                    <CardHeader>
                      <CardTitle className="text-lg font-headline flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" /> Trending Needs
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                          <span className="font-bold">Blood Donation</span>
                          <Badge className="bg-white text-secondary">High</Badge>
                       </div>
                       <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                          <span className="font-bold">Tutoring</span>
                          <Badge className="bg-white/20 text-white">Normal</Badge>
                       </div>
                       <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                          <span className="font-bold">Repairs</span>
                          <Badge className="bg-white/20 text-white">Normal</Badge>
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="border-none shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-headline">Live Feed</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="space-y-1 max-h-80 overflow-auto">
                        {allRequests?.slice(0, 5).map(r => (
                          <div key={r.id} className="p-4 border-b hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="text-[8px] h-4 uppercase">{r.status}</Badge>
                              <span className="text-[10px] text-slate-400 font-bold">{format(r.createdAt?.toDate() || new Date(), 'HH:mm')}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700 line-clamp-1">{r.title}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                 </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
