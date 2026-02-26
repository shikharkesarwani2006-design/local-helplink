"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, orderBy, doc } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
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
  Search, 
  MoreHorizontal,
  UserCheck,
  UserX,
  History,
  Activity,
  ArrowUpRight,
  Database,
  Loader2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { format } from "date-fns";
import { seedDatabase } from "@/lib/seed-data";

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isSeeding, setIsSeeding] = useState(false);

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

  const stats = useMemo(() => {
    if (!allUsers || !allRequests) return { totalUsers: 0, totalRequests: 0, fulfillmentRate: 0, activeVolunteers: 0 };
    const completed = allRequests.filter(r => r.status === 'completed').length;
    return { 
      totalUsers: allUsers.length, 
      totalRequests: allRequests.length, 
      fulfillmentRate: allRequests.length > 0 ? (completed / allRequests.length) * 100 : 0, 
      activeVolunteers: allUsers.filter(u => u.totalHelped > 0).length 
    };
  }, [allUsers, allRequests]);

  const categoryData = useMemo(() => {
    if (!allRequests) return [];
    const counts: Record<string, number> = {};
    allRequests.forEach(r => counts[r.category] = (counts[r.category] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allRequests]);

  const COLORS = ['#A7D1AB', '#78B0B5', '#FF8042', '#0088FE'];

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
      toast({ title: "Seed Complete!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Seed Failed" });
    } finally {
      setIsSeeding(false);
    }
  };

  if (isUserLoading || isProfileLoading || profile?.role !== 'admin') {
    return <div className="flex h-screen items-center justify-center"><Activity className="animate-spin h-8 w-8 text-secondary" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <header className="bg-white border-b py-8 sticky top-0 z-30 shadow-sm">
        <div className="container px-6 mx-auto flex justify-between items-center">
          <div><h1 className="text-3xl font-headline font-bold text-secondary">System Oversight</h1></div>
          <div className="flex gap-3">
            <Button onClick={handleSeedData} disabled={isSeeding} className="bg-primary text-white gap-2">
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Seed Data
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto mt-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm"><CardContent className="pt-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Citizens</p>
            <h3 className="text-3xl font-bold mt-1">{stats.totalUsers}</h3>
          </CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="pt-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missions</p>
            <h3 className="text-3xl font-bold mt-1">{stats.totalRequests}</h3>
          </CardContent></Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="bg-white border-none shadow-sm"><CardHeader><CardTitle className="text-lg">Need Categories</CardTitle></CardHeader>
            <CardContent className="h-80"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#78B0B5" /></BarChart>
            </ResponsiveContainer></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="bg-white mb-6 p-1 border rounded-2xl"><TabsTrigger value="users">User Base</TabsTrigger></TabsList>
          <TabsContent value="users">
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <Table>
                <TableHeader><TableRow><TableHead>Citizen</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {allUsers?.map((u) => (
                    <TableRow key={u.id}><TableCell>{u.name}</TableCell><TableCell>{u.role}</TableCell>
                      <TableCell>{u.verified ? <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge> : "Pending"}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => handleVerifyUser(u.id, !u.verified)}>{u.verified ? <UserX /> : <UserCheck />}</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
