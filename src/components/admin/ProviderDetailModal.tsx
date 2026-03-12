
"use client";

import { useState, useMemo, useEffect } from "react";
import { query, collection, where, orderBy, getDocs, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Wrench, 
  CircleDollarSign, 
  Clock, 
  History, 
  Star, 
  Briefcase, 
  MapPin, 
  ShieldCheck, 
  Mail, 
  Phone,
  BarChart as BarIcon,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowUpRight,
  Inbox
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { format, subDays, startOfDay, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";

export function ProviderDetailModal({ provider, onClose }: { provider: any; onClose: () => void }) {
  const db = useFirestore();
  const [jobHistory, setJobHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, string>>({});

  // 1. Fetch Real-time Pending Requests for this provider
  const pendingRequestsQuery = useMemoFirebase(() => {
    if (!db || !provider?.id) return null;
    return query(
      collection(db, "requests"), 
      where("acceptedBy", "==", provider.id), 
      where("status", "==", "accepted"),
      orderBy("acceptedAt", "desc")
    );
  }, [db, provider?.id]);
  const { data: pendingJobs } = useCollection(pendingRequestsQuery);

  // 2. Fetch Reviews for this provider
  const reviewsQuery = useMemoFirebase(() => {
    if (!db || !provider?.id) return null;
    return query(
      collection(db, "ratings"), 
      where("toUser", "==", provider.id), 
      orderBy("createdAt", "desc")
    );
  }, [db, provider?.id]);
  const { data: reviews } = useCollection(reviewsQuery);

  // 3. Fetch Job History (Heavier calculation, non-realtime for efficiency in modal)
  useEffect(() => {
    async function loadHistory() {
      if (!db || !provider?.id) return;
      setLoadingHistory(true);
      const q = query(
        collection(db, "requests"), 
        where("acceptedBy", "==", provider.id), 
        where("status", "==", "completed"),
        orderBy("completedAt", "desc")
      );
      const snap = await getDocs(q);
      setJobHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingHistory(false);
    }
    loadHistory();
  }, [db, provider?.id]);

  // Live counter for pending jobs
  useEffect(() => {
    const updateElapsed = () => {
      const times: Record<string, string> = {};
      pendingJobs?.forEach(req => {
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
  }, [pendingJobs]);

  const earningsData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return { date: format(date, "MMM dd"), amount: 0, rawDate: startOfDay(date) };
    }).reverse();

    jobHistory.forEach(job => {
      if (!job.completedAt) return;
      const jobDate = startOfDay(job.completedAt.toDate());
      const match = last7Days.find(d => d.rawDate.getTime() === jobDate.getTime());
      if (match) {
        const earnings = (job.duration || 0) * (provider.hourlyRate || 0);
        match.amount += earnings;
      }
    });
    return last7Days;
  }, [jobHistory, provider?.hourlyRate]);

  if (!provider) return null;

  return (
    <Dialog open={!!provider} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl rounded-[2.5rem] p-0 overflow-hidden h-[90vh] flex flex-col">
        <header className="p-8 bg-slate-900 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50" />
          <div className="flex items-center gap-6 relative z-10">
            <Avatar className="h-20 w-20 border-4 border-white/10 ring-4 ring-primary/20 shadow-2xl">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${provider.email}`} />
              <AvatarFallback className="bg-primary text-white text-xl font-bold">{provider.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-3xl font-headline font-bold">{provider.name}</DialogTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase text-[10px] font-black px-3 py-1">
                  {provider.serviceCategory}
                </Badge>
              </div>
              <div className="flex gap-4 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {provider.email}</span>
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {provider.phone || "No phone"}</span>
                <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {provider.experience || "Entry"} Experience</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-hidden flex flex-col bg-slate-50/50">
          <Tabs defaultValue="overview" className="flex-grow flex flex-col">
            <div className="px-8 border-b bg-white">
              <TabsList className="h-14 bg-transparent gap-8 p-0">
                {['overview', 'earnings', 'pending', 'history', 'reviews'].map(tab => (
                  <TabsTrigger 
                    key={tab} 
                    value={tab} 
                    className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent font-bold text-xs uppercase tracking-widest text-slate-400 data-[state=active]:text-slate-900 transition-all px-0"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <ScrollArea className="flex-grow p-8">
              {/* TAB 1: OVERVIEW */}
              <TabsContent value="overview" className="mt-0 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="rounded-3xl border-none shadow-sm bg-white p-6 space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Service Profile</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Availability</p>
                        <p className="font-bold text-slate-900">{provider.isAvailable ? "🟢 Available" : "🔴 Busy"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Service Area</p>
                        <p className="font-bold text-slate-900">{provider.serviceArea}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Working Hours</p>
                        <p className="font-bold text-slate-900">{provider.workingHours?.from} - {provider.workingHours?.to}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Verification</p>
                        <Badge className={cn("mt-1", provider.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {provider.verified ? "Verified Expert" : "Pending Approval"}
                        </Badge>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Expertise Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {provider.skills?.map((s: string) => <Badge key={s} variant="secondary" className="bg-slate-50 text-[10px] font-bold">{s}</Badge>)}
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-sm bg-white p-6 space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Performance Metrics</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-4 bg-blue-50 rounded-2xl">
                        <TrendingUp className="w-4 h-4 text-blue-600 mb-2" />
                        <p className="text-xl font-black text-blue-900">{provider.totalJobsDone || 0}</p>
                        <p className="text-[9px] uppercase font-bold text-blue-600">Lifetime Jobs</p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-2xl">
                        <Star className="w-4 h-4 text-amber-600 mb-2" />
                        <p className="text-xl font-black text-amber-900">{provider.rating?.toFixed(1) || "5.0"}</p>
                        <p className="text-[9px] uppercase font-bold text-amber-600">Avg Rating</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-2xl">
                        <CircleDollarSign className="w-4 h-4 text-emerald-600 mb-2" />
                        <p className="text-xl font-black text-emerald-900">₹{provider.totalEarnings || 0}</p>
                        <p className="text-[9px] uppercase font-bold text-emerald-600">Total Revenue</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-2xl">
                        <Clock className="w-4 h-4 text-purple-600 mb-2" />
                        <p className="text-xl font-black text-purple-900">12m</p>
                        <p className="text-[9px] uppercase font-bold text-purple-600">Avg Response</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* TAB 2: EARNINGS */}
              <TabsContent value="earnings" className="mt-0 space-y-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="bg-emerald-600 text-white rounded-3xl p-6">
                    <CircleDollarSign className="w-8 h-8 opacity-20 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Earnings</p>
                    <h3 className="text-4xl font-black">₹{provider.totalEarnings || 0}</h3>
                  </Card>
                  <Card className="bg-white rounded-3xl p-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Hourly Rate</p>
                    <h3 className="text-2xl font-black text-slate-900">₹{provider.hourlyRate || 0}/hr</h3>
                    <p className="text-xs text-slate-400 mt-2">Professional Service Level</p>
                  </Card>
                  <Card className="bg-white rounded-3xl p-6 shadow-sm border-l-4 border-l-primary">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Weekly Volume</p>
                    <h3 className="text-2xl font-black text-slate-900">₹{earningsData.reduce((acc, d) => acc + d.amount, 0)}</h3>
                    <p className="text-xs text-slate-400 mt-2">Past 7 Days Impact</p>
                  </Card>
                </div>

                <Card className="bg-white rounded-3xl p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="font-bold">Earnings Momentum (7D)</h4>
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100 font-black">Revenue Positive</Badge>
                  </div>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={earningsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </TabsContent>

              {/* TAB 3: PENDING JOBS */}
              <TabsContent value="pending" className="mt-0">
                <Card className="bg-white rounded-3xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-[10px] uppercase pl-8">Request Title</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase">Requester</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase">Elapsed Time</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-right pr-8">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!pendingJobs || pendingJobs.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400">This provider has no active jobs right now.</TableCell></TableRow>
                      ) : pendingJobs.map((job) => (
                        <TableRow key={job.id} className="border-slate-50">
                          <TableCell className="pl-8 py-4">
                            <span className="font-bold block">{job.title}</span>
                            <span className="text-[10px] uppercase text-red-500 font-black">{job.urgency} Urgency</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px]">{job.postedByName?.[0]}</AvatarFallback></Avatar>
                              <span className="text-xs font-bold">{job.postedByName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-50 text-emerald-700 font-black h-6">{elapsedTimes[job.id] || "Just now"}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" className="rounded-xl text-emerald-600 font-bold" onClick={() => updateDocumentNonBlocking(doc(db, "requests", job.id), { status: "completed", completedAt: new Date() })}>Force Complete</Button>
                              <Button variant="ghost" size="sm" className="rounded-xl text-amber-600 font-bold" onClick={() => updateDocumentNonBlocking(doc(db, "requests", job.id), { status: "open", acceptedBy: null, acceptedAt: null })}>Reassign</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* TAB 4: JOB HISTORY */}
              <TabsContent value="history" className="mt-0">
                <Card className="bg-white rounded-3xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-[10px] uppercase pl-8">Job Title</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase">Completed</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase">Duration</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-right pr-8">Earning</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingHistory ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400"><Activity className="animate-spin mx-auto" /></TableCell></TableRow>
                      ) : jobHistory.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400">No completed jobs in history.</TableCell></TableRow>
                      ) : jobHistory.map((job) => (
                        <TableRow key={job.id} className="border-slate-50 group hover:bg-slate-50/50">
                          <TableCell className="pl-8 py-4">
                            <span className="font-bold text-slate-900 block">{job.title}</span>
                            <span className="text-[10px] uppercase text-slate-400 font-bold">{job.category}</span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium">
                            {job.completedAt ? format(job.completedAt.toDate(), "MMM dd, yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-700">{job.duration || 0} hrs</TableCell>
                          <TableCell className="text-right pr-8 font-black text-emerald-600">
                            ₹{(job.duration || 0) * (provider.hourlyRate || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* TAB 5: REVIEWS */}
              <TabsContent value="reviews" className="mt-0 space-y-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <Card className="bg-white rounded-3xl p-8 shadow-sm text-center md:w-1/3">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Overall Reputation</p>
                    <div className="text-6xl font-black text-slate-900 mb-2">{provider.rating?.toFixed(1) || "5.0"}</div>
                    <div className="flex justify-center gap-1 mb-4">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
                    </div>
                    <p className="text-xs text-slate-400">Based on {reviews?.length || 0} reviews</p>
                  </Card>

                  <div className="md:w-2/3 space-y-4">
                    {!reviews || reviews.length === 0 ? (
                      <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed">
                        <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 font-medium">No community reviews yet.</p>
                      </div>
                    ) : reviews.map((r) => (
                      <Card key={r.id} className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border-none hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10"><AvatarFallback>N</AvatarFallback></Avatar>
                            <div>
                              <p className="font-bold text-sm">Verified Neighbor</p>
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(s => <Star key={s} className={cn("w-3 h-3", s <= r.score ? "text-amber-400 fill-amber-400" : "text-slate-100")} />)}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{r.createdAt ? format(r.createdAt.toDate(), "MMM dd") : "Recent"}</span>
                        </div>
                        <p className="text-sm text-slate-600 font-medium italic">"{r.comment || "Great job, thank you!"}"</p>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { ScrollArea } from "@/components/ui/scroll-area";
