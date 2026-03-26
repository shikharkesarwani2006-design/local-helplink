
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, doc, Timestamp } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Trash2,
  CheckCircle2,
  Clock,
  Filter,
  Eye,
  MoreVertical,
  Calendar,
  RefreshCw,
  Flag,
  MapPin,
  MessageSquare,
  User,
  ShieldCheck,
  Droplets,
  BookOpen,
  Wrench,
  AlertCircle,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { format, addHours } from "date-fns";
import { cn } from "@/lib/utils";

function UserSmallCard({ userId, label }: { userId: string; label: string }) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => (db && userId ? doc(db, "users", userId) : null), [db, userId]);
  const { data: profile } = useDoc(userRef);

  if (!userId || !profile) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800">
      <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-700 shadow-sm">
        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email}`} />
        <AvatarFallback>{profile.name?.[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{profile.name}</p>
        <div className="flex items-center gap-2">
          <Badge className="h-4 text-[8px] font-black uppercase bg-primary/10 text-primary border-none">{profile.role}</Badge>
          {profile.rating && <span className="text-[10px] font-bold text-amber-500">★ {profile.rating}</span>}
        </div>
      </div>
    </div>
  );
}

export default function AdminRequestsManager() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

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

  const requestsQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "requests"));
  }, [db, profile?.role]);
  const { data: rawRequests, isLoading: isRequestsLoading } = useCollection(requestsQuery);

  const allRequestsSorted = useMemo(() => {
    if (!rawRequests) return [];
    return [...rawRequests].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawRequests]);

  const stats = useMemo(() => {
    if (!allRequestsSorted) return { total: 0, open: 0, active: 0, completed: 0, expired: 0 };
    const now = new Date();
    return {
      total: allRequestsSorted.length,
      open: allRequestsSorted.filter(r => r.status === 'open').length,
      active: allRequestsSorted.filter(r => r.status === 'accepted').length,
      completed: allRequestsSorted.filter(r => r.status === 'completed').length,
      expired: allRequestsSorted.filter(r => r.expiresAt?.toDate() < now && r.status === 'open').length
    };
  }, [allRequestsSorted]);

  const filteredRequests = useMemo(() => {
    if (!allRequestsSorted) return [];
    const now = new Date();
    return allRequestsSorted.filter(r => {
      const isExpired = r.expiresAt?.toDate() < now && r.status === 'open';
      const effectiveStatus = isExpired ? 'expired' : r.status;

      const matchesSearch = (r.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;
      const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;
      const matchesUrgency = urgencyFilter === "all" || r.urgency === urgencyFilter;
      return matchesSearch && matchesStatus && matchesCategory && matchesUrgency;
    });
  }, [allRequestsSorted, searchQuery, statusFilter, categoryFilter, urgencyFilter]);

  const handleForceComplete = (requestId: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "requests", requestId), { 
      status: "completed", 
      completedAt: Timestamp.now() 
    });
    toast({ title: "Request Completed", description: "Mission marked as successful by admin." });
  };

  const handleReopen = (requestId: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "requests", requestId), { 
      status: "open", 
      acceptedBy: null, 
      acceptedAt: null 
    });
    toast({ title: "Request Reopened", description: "Missions is back in the open feed." });
  };

  const handleExtendExpiry = (requestId: string, currentExpiry: Timestamp) => {
    if (!db) return;
    const newExpiry = addHours(currentExpiry?.toDate() || new Date(), 24);
    updateDocumentNonBlocking(doc(db, "requests", requestId), { 
      expiresAt: Timestamp.fromDate(newExpiry) 
    });
    toast({ title: "Expiry Extended", description: "Request extended by 24 hours." });
  };

  const handleDeleteRequest = (requestId: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, "requests", requestId));
    toast({ variant: "destructive", title: "Request Deleted" });
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'blood': return <Droplets className="w-3.5 h-3.5 text-red-500" />;
      case 'tutor': return <BookOpen className="w-3.5 h-3.5 text-blue-500" />;
      case 'repair': return <Wrench className="w-3.5 h-3.5 text-amber-500" />;
      case 'emergency': return <AlertCircle className="w-3.5 h-3.5 text-purple-500" />;
      default: return <MessageSquare className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string, expiresAt?: any) => {
    const isExpired = expiresAt?.toDate() < new Date() && status === 'open';
    if (isExpired) return <Badge className="bg-slate-100 text-slate-500 border-none px-3 font-bold uppercase text-[9px]">Expired</Badge>;

    switch (status) {
      case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 font-bold uppercase text-[9px]">Completed</Badge>;
      case 'accepted': return <Badge className="bg-amber-100 text-amber-700 border-none px-3 font-bold uppercase text-[9px]">Active</Badge>;
      default: return <Badge className="bg-blue-100 text-blue-700 border-none px-3 font-bold uppercase text-[9px]">Open</Badge>;
    }
  };

  if (isUserLoading || isProfileLoading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1E]"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-50 pb-20">
      <header className="bg-[#1A1F35] border-b border-white/5 py-8 px-6">
        <div className="container mx-auto space-y-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-headline font-bold text-white tracking-tight">Community Missions</h1>
              <p className="text-slate-400 text-sm font-medium">Monitor, moderate and manage all global community help requests.</p>
            </div>
            
            <div className="flex gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-6 py-3 rounded-2xl border border-white/5 shadow-sm">
              <div className="flex flex-col items-center px-2 border-r border-white/5"><span className="text-white text-lg">{stats.total}</span> Total</div>
              <div className="flex flex-col items-center px-2 border-r border-white/5 text-blue-400"><span className="text-lg">{stats.open}</span> Open</div>
              <div className="flex flex-col items-center px-2 border-r border-white/5 text-amber-400"><span className="text-lg">{stats.active}</span> Active</div>
              <div className="flex flex-col items-center px-2 border-r border-white/5 text-emerald-400"><span className="text-lg">{stats.completed}</span> Success</div>
              <div className="flex flex-col items-center px-2 text-slate-500"><span className="text-lg">{stats.expired}</span> Expired</div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
              <TabsList className="bg-white/5 rounded-xl p-1 h-11 border border-white/5">
                <TabsTrigger value="all" className="rounded-lg font-bold px-6 data-[state=active]:bg-primary">All Missions</TabsTrigger>
                <TabsTrigger value="open" className="rounded-lg font-bold px-6 data-[state=active]:bg-primary">Open Feed</TabsTrigger>
                <TabsTrigger value="accepted" className="rounded-lg font-bold px-6 data-[state=active]:bg-primary">In Progress</TabsTrigger>
                <TabsTrigger value="completed" className="rounded-lg font-bold px-6 data-[state=active]:bg-primary">Resolved</TabsTrigger>
                <TabsTrigger value="expired" className="rounded-lg font-bold px-6 data-[state=active]:bg-primary">Expired</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-grow max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Filter by title..." 
                  className="pl-11 h-11 bg-white/5 border-white/5 rounded-xl text-white placeholder:text-slate-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5 shadow-sm">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select className="text-xs font-bold bg-transparent outline-none cursor-pointer text-slate-300" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all" className="bg-[#1A1F35]">Any Category</option>
                  <option value="blood" className="bg-[#1A1F35]">Blood Donation</option>
                  <option value="tutor" className="bg-[#1A1F35]">Tutoring</option>
                  <option value="repair" className="bg-[#1A1F35]">Repair</option>
                  <option value="emergency" className="bg-[#1A1F35]">Emergency</option>
                </select>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5 shadow-sm">
                <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                <select className="text-xs font-bold bg-transparent outline-none cursor-pointer text-slate-300" value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
                  <option value="all" className="bg-[#1A1F35]">Any Urgency</option>
                  <option value="high" className="bg-[#1A1F35]">🔴 Critical</option>
                  <option value="medium" className="bg-[#1A1F35]">🟡 Medium</option>
                  <option value="low" className="bg-[#1A1F35]">🟢 Normal</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto py-8">
        <Card className="border-none shadow-xl overflow-hidden bg-[#1A1F35] rounded-[2rem]">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5">
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 pl-8 w-12 text-slate-500">#</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-slate-500">Request Title</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-slate-500">Category</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-slate-500">Urgency</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-slate-500">Status</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-slate-500">By Member</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-slate-500">Assigned</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-right pr-8 text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isRequestsLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-24 text-slate-500"><RefreshCw className="animate-spin w-8 h-8 mx-auto mb-2" /> Syncing network...</TableCell></TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-24 text-slate-500">No matching requests found.</TableCell></TableRow>
              ) : filteredRequests.map((r, i) => (
                <TableRow 
                  key={r.id} 
                  className={cn(
                    "border-white/5 group hover:bg-white/[0.02] transition-colors",
                    r.urgency === 'high' ? "border-l-4 border-l-rose-500" : 
                    r.urgency === 'medium' ? "border-l-4 border-l-amber-500" : 
                    "border-l-4 border-l-emerald-500"
                  )}
                >
                  <TableCell className="pl-8 py-4 text-xs font-black text-slate-700">{i + 1}</TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col min-w-[200px]">
                      <span className="font-bold text-slate-200 truncate cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedRequest(r)}>{r.title}</span>
                      <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1 uppercase tracking-tight"><Clock className="w-3 h-3" /> {r.createdAt ? format(r.createdAt.toDate(), 'MMM dd, HH:mm') : '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      {getCategoryIcon(r.category)}
                      <span className="capitalize">{r.category}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 border-none",
                      r.urgency === 'high' ? "bg-rose-500/20 text-rose-400" : 
                      r.urgency === 'medium' ? "bg-amber-500/20 text-amber-400" : 
                      "bg-emerald-500/20 text-emerald-400"
                    )}>
                      {r.urgency}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(r.status, r.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[8px] font-bold bg-white/10 text-white">{r.postedByName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-slate-400">{r.postedByName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.acceptedBy ? (
                      <Badge variant="secondary" className="bg-white/5 text-slate-400 font-bold text-[10px] border-none">Member Linked</Badge>
                    ) : (
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">Awaiting</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-slate-600"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="right" className="rounded-2xl w-56 p-2 shadow-2xl border-none bg-[#1A1F35]">
                        <DropdownMenuLabel className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-1">Moderation</DropdownMenuLabel>
                        <DropdownMenuItem className="rounded-xl gap-2 font-bold cursor-pointer text-slate-200" onClick={() => setSelectedRequest(r)}>
                          <Eye className="w-4 h-4 text-primary" /> Full Details
                        </DropdownMenuItem>
                        
                        {r.status !== 'completed' && (
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold text-emerald-400 cursor-pointer" onClick={() => handleForceComplete(r.id)}>
                            <CheckCircle2 className="w-4 h-4" /> Force Resolved
                          </DropdownMenuItem>
                        )}

                        {r.status === 'accepted' && (
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold text-amber-400 cursor-pointer" onClick={() => handleReopen(r.id)}>
                            <RefreshCw className="w-4 h-4" /> Reset to Open
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem className="rounded-xl gap-2 font-bold text-blue-400 cursor-pointer" onClick={() => handleExtendExpiry(r.id, r.expiresAt)}>
                          <Calendar className="w-4 h-4" /> Extend Deadline
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-white/5" />
                        
                        <DropdownMenuItem className="rounded-xl gap-2 font-bold text-rose-400 cursor-pointer" onClick={() => handleDeleteRequest(r.id)}>
                          <Trash2 className="w-4 h-4" /> Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-[#0A0F1E]">
          {selectedRequest && (
            <div className="flex flex-col max-h-[90vh]">
              <header className={cn(
                "p-8 text-white relative border-b border-white/5",
                selectedRequest.urgency === 'high' ? "bg-rose-600" : "bg-[#1A1F35]"
              )}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-50" />
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <Badge className="bg-white/20 text-white border-none px-4 py-1.5 font-black uppercase text-[10px] tracking-widest">
                    {selectedRequest.category} • {selectedRequest.urgency} Urgency
                  </Badge>
                  <span className="text-[10px] font-bold opacity-70">UID: {selectedRequest.id}</span>
                </div>
                <DialogTitle className="text-3xl font-headline font-bold relative z-10 leading-tight">{selectedRequest.title}</DialogTitle>
              </header>

              <div className="flex-grow overflow-y-auto p-8">
                <div className="grid md:grid-cols-12 gap-8">
                  <div className="md:col-span-7 space-y-8">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Description</h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium whitespace-pre-wrap">
                        {selectedRequest.description || "No detailed description provided."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Location</p>
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <MapPin className="w-4 h-4 text-primary" /> {selectedRequest.location?.area || "Campuswide"}
                        </div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System Status</p>
                        <div className="flex items-center gap-2 text-sm font-bold capitalize">
                          {getStatusBadge(selectedRequest.status, selectedRequest.expiresAt)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Mission Timeline</h4>
                      <div className="space-y-4 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
                        <div className="relative">
                          <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-[#0A0F1E]" />
                          <p className="text-xs font-bold text-white">Broadcast Initialized</p>
                          <p className="text-[10px] text-slate-500">{selectedRequest.createdAt ? format(selectedRequest.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'Recently'}</p>
                        </div>
                        {selectedRequest.acceptedAt && (
                          <div className="relative">
                            <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-[#0A0F1E]" />
                            <p className="text-xs font-bold text-white">Neighbor Assigned</p>
                            <p className="text-[10px] text-slate-500">{format(selectedRequest.acceptedAt.toDate(), 'MMM dd, yyyy HH:mm')}</p>
                          </div>
                        )}
                        {selectedRequest.completedAt && (
                          <div className="relative">
                            <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-[#0A0F1E]" />
                            <p className="text-xs font-bold text-white">Resolution Confirmed</p>
                            <p className="text-[10px] text-slate-500">{format(selectedRequest.completedAt.toDate(), 'MMM dd, yyyy HH:mm')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-6">
                    <UserSmallCard userId={selectedRequest.createdBy} label="Requester" />
                    
                    {selectedRequest.acceptedBy ? (
                      <UserSmallCard userId={selectedRequest.acceptedBy} label="Responder" />
                    ) : (
                      <div className="p-6 border-2 border-dashed border-white/5 rounded-3xl text-center space-y-2">
                        <User className="w-8 h-8 text-slate-800 mx-auto" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">Searching for helper</p>
                      </div>
                    )}

                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 space-y-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        <h5 className="text-xs font-black uppercase text-primary tracking-widest">Admin Control Panel</h5>
                      </div>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start rounded-xl h-10 text-xs font-bold gap-2 border-white/5 bg-white/5 hover:bg-white/10" onClick={() => handleExtendExpiry(selectedRequest.id, selectedRequest.expiresAt)}>
                          <Calendar className="w-3.5 h-3.5" /> Extend Deadline (+24h)
                        </Button>
                        <Button variant="outline" className="w-full justify-start rounded-xl h-10 text-xs font-bold gap-2 border-white/5 bg-white/5 hover:bg-white/10 text-rose-400" onClick={() => handleDeleteRequest(selectedRequest.id)}>
                          <Trash2 className="w-3.5 h-3.5" /> Remove Broadcast
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/5 border-t border-white/5 flex flex-wrap gap-3 justify-end mt-auto">
                <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setSelectedRequest(null)}>Close Viewer</Button>
                {selectedRequest.status !== 'completed' && (
                  <Button className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-2 shadow-lg shadow-emerald-500/20" onClick={() => handleForceComplete(selectedRequest.id)}>
                    <CheckCircle2 className="w-4 h-4" /> Force Resolved
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
