
"use client";

import { useState, useMemo, useEffect } from "react";
import { query, collection, where, orderBy, doc, getDocs } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Wrench, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  Star, 
  CircleDollarSign,
  AlertCircle,
  MoreVertical,
  Eye,
  CheckCircle2,
  Ban,
  UserX,
  Smartphone,
  Phone,
  ArrowUpRight,
  Trophy,
  Activity
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { format, isSameWeek } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProviderDetailModal } from "@/components/admin/ProviderDetailModal";

export default function ProviderMonitor() {
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, string>>({});

  // 1. Fetch Providers
  const providersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"), where("role", "==", "provider"), orderBy("totalJobsDone", "desc"));
  }, [db]);
  const { data: providers, isLoading: isProvidersLoading } = useCollection(providersQuery);

  // 2. Fetch All Accepted Requests (Active Jobs)
  const activeRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "requests"), where("status", "==", "accepted"), orderBy("acceptedAt", "desc"));
  }, [db]);
  const { data: activeRequests } = useCollection(activeRequestsQuery);

  // Stats Calculations
  const stats = useMemo(() => {
    if (!providers) return { total: 0, verified: 0, pending: 0, available: 0, totalJobs: 0, platformEarnings: 0 };
    
    const verified = providers.filter(p => p.verified).length;
    const pending = providers.filter(p => !p.verified).length;
    const available = providers.filter(p => p.isAvailable).length;
    const totalJobs = providers.reduce((acc, p) => acc + (p.totalJobsDone || 0), 0);
    const platformEarnings = providers.reduce((acc, p) => acc + (p.totalEarnings || 0), 0);

    return { total: providers.length, verified, pending, available, totalJobs, platformEarnings };
  }, [providers]);

  // Live elapsed counter
  useEffect(() => {
    const updateElapsed = () => {
      const times: Record<string, string> = {};
      activeRequests?.forEach(req => {
        if (req.acceptedAt) {
          const mins = Math.floor((Date.now() - req.acceptedAt.toMillis()) / 60000);
          times[req.id] = mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
        }
      });
      setElapsedTimes(times);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [activeRequests]);

  const getStatusColor = (elapsedStr: string) => {
    if (!elapsedStr) return "";
    const isHour = elapsedStr.includes('h');
    const mins = isHour ? parseInt(elapsedStr.split('h')[0]) * 60 : parseInt(elapsedStr);
    if (mins >= 180) return "bg-red-50 text-red-700";
    if (mins >= 60) return "bg-amber-50 text-amber-700";
    return "bg-emerald-50 text-emerald-700";
  };

  const leaderboardData = useMemo(() => {
    if (!providers) return [];
    return providers.slice(0, 5).map(p => ({
      name: p.name,
      jobs: p.totalJobsDone || 0,
      earnings: p.totalEarnings || 0
    }));
  }, [providers]);

  if (isProvidersLoading) return <div className="flex h-screen items-center justify-center"><Activity className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="bg-white border-b py-10 px-6">
        <div className="container mx-auto space-y-2">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <Wrench className="w-8 h-8 text-primary" /> Provider Performance Monitor
          </h1>
          <p className="text-slate-500 text-sm font-medium">Real-time oversight of neighborhood service professionals and revenue impact.</p>
        </div>
      </header>

      <main className="container px-6 mx-auto py-8 space-y-12">
        
        {/* 📊 High Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden p-6 space-y-4">
            <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center"><Wrench className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Providers</p>
              <h3 className="text-2xl font-bold">{stats.total}</h3>
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-6 space-y-4">
            <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified Experts</p>
              <h3 className="text-2xl font-bold">{stats.verified}</h3>
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-6 space-y-4">
            <div className="bg-amber-50 w-10 h-10 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Approvals</p>
              <h3 className="text-2xl font-bold">{stats.pending}</h3>
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-6 space-y-4">
            <div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center"><Activity className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live/Available</p>
              <h3 className="text-2xl font-bold">{stats.available}</h3>
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden p-6 space-y-4">
            <div className="bg-purple-50 w-10 h-10 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jobs Handled</p>
              <h3 className="text-2xl font-bold">{stats.totalJobs}</h3>
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-primary text-white overflow-hidden p-6 space-y-4">
            <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center"><CircleDollarSign className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Total Earnings</p>
              <h3 className="text-2xl font-black">₹{stats.platformEarnings}</h3>
            </div>
          </Card>
        </div>

        {/* 📋 Provider Activity Table */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-headline font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Active Service Directory
            </h2>
          </div>
          <Card className="border-none shadow-sm overflow-hidden bg-white rounded-3xl">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100">
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 pl-8">Provider</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Status</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Verified</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Jobs Done</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Earnings</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Avg Rating</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-right pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers?.map((p) => (
                  <TableRow key={p.id} className="border-slate-50 group hover:bg-slate-50/30 transition-colors">
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.email}`} />
                          <AvatarFallback className="font-bold">{p.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-slate-900 block">{p.name}</span>
                          <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-200">
                            {p.serviceCategory}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", p.isAvailable ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500")} />
                        <span className="text-xs font-bold text-slate-600">{p.isAvailable ? "Available" : "Busy"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.verified ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-none uppercase text-[9px] font-black">Verified</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-none uppercase text-[9px] font-black">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">{p.totalJobsDone || 0}</TableCell>
                    <TableCell className="font-black text-emerald-600">₹{p.totalEarnings || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-slate-700">{p.rating?.toFixed(1) || "5.0"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="right" className="rounded-2xl w-56 p-2">
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold cursor-pointer" onClick={() => setSelectedProvider(p)}>
                            <Eye className="w-4 h-4" /> View Full Activity
                          </DropdownMenuItem>
                          {!p.verified && (
                            <DropdownMenuItem className="rounded-xl gap-2 font-bold text-emerald-600 cursor-pointer" onClick={() => updateDocumentNonBlocking(doc(db, "users", p.id), { verified: true })}>
                              <CheckCircle2 className="w-4 h-4" /> Verify Account
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold text-amber-600 cursor-pointer">
                            <AlertCircle className="w-4 h-4" /> Warn Provider
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold text-red-600 cursor-pointer">
                            <UserX className="w-4 h-4" /> Suspend Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* 📋 All Pending Jobs Overview */}
        <section className="space-y-6">
          <h2 className="text-xl font-headline font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" /> Live Platform Mission Queue
          </h2>
          <Card className="border-none shadow-sm overflow-hidden bg-white rounded-3xl">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100">
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 pl-8">Job Title</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Category/Urgency</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Assigned To</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Accepted At</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Elapsed</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-right pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!activeRequests || activeRequests.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400">No active/pending jobs currently.</TableCell></TableRow>
                ) : activeRequests.map((req) => (
                  <TableRow key={req.id} className={cn("border-slate-50", getStatusColor(elapsedTimes[req.id]))}>
                    <TableCell className="pl-8 py-4 font-bold text-slate-900">{req.title}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400">{req.category}</span>
                        <span className="text-[10px] font-black uppercase text-red-500">{req.urgency} Urgency</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px]">?</AvatarFallback></Avatar>
                        <span className="text-xs font-bold text-slate-700">Provider #{req.acceptedBy?.slice(0, 4)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{req.acceptedAt ? format(req.acceptedAt.toDate(), "HH:mm, MMM dd") : "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-black h-6">
                        {elapsedTimes[req.id] || "Calculating..."}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => updateDocumentNonBlocking(doc(db, "requests", req.id), { status: "open", acceptedBy: null, acceptedAt: null })}><Smartphone className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => updateDocumentNonBlocking(doc(db, "requests", req.id), { status: "completed", completedAt: new Date() })}><CheckCircle2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* 💰 Earnings & Performance Analytics */}
        <section className="grid lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-7 bg-white border-none shadow-sm rounded-3xl p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-headline font-bold">Provider Rankings</h3>
                <p className="text-xs text-slate-400 font-medium">Comparing top experts by neighborhood volume.</p>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase px-3 py-1">Top Volume</Badge>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaderboardData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="jobs" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="lg:col-span-5 bg-white border-none shadow-sm rounded-3xl p-8 space-y-8">
            <div>
              <h3 className="text-lg font-headline font-bold">Revenue Leaderboard</h3>
              <p className="text-xs text-slate-400 font-medium">Monthly generated community earnings.</p>
            </div>
            <div className="space-y-4">
              {providers?.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-emerald-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-black text-slate-300 group-hover:text-emerald-300">#{i + 1}</div>
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-[10px] uppercase font-black text-slate-400">{p.serviceCategory}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">₹{p.totalEarnings || 0}</p>
                    <p className="text-[9px] uppercase font-bold text-slate-400">{p.totalJobsDone || 0} Jobs</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </main>

      <ProviderDetailModal provider={selectedProvider} onClose={() => setSelectedProvider(null)} />
    </div>
  );
}
