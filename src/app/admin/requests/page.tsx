
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, orderBy, doc, deleteDoc } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Trash2,
  CheckCircle2,
  Clock,
  Filter,
  Eye,
  MoreVertical,
  Calendar,
  AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminRequestsManager() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

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
    return query(collection(db, "requests"), orderBy("createdAt", "desc"));
  }, [db, profile?.role]);
  const { data: allRequests, isLoading: isRequestsLoading } = useCollection(requestsQuery);

  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests.filter(r => {
      const matchesSearch = r.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [allRequests, searchQuery, statusFilter, categoryFilter]);

  const handleForceComplete = (requestId: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "requests", requestId), { status: "completed", completedAt: new Date() });
    toast({ title: "Request Completed", description: "Mission marked as successful by admin." });
  };

  const handleDeleteRequest = (requestId: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, "requests", requestId));
    toast({ variant: "destructive", title: "Request Deleted" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 font-bold uppercase text-[9px]">Completed</Badge>;
      case 'accepted': return <Badge className="bg-amber-100 text-amber-700 border-none px-3 font-bold uppercase text-[9px]">Accepted</Badge>;
      case 'expired': return <Badge className="bg-slate-100 text-slate-500 border-none px-3 font-bold uppercase text-[9px]">Expired</Badge>;
      default: return <Badge className="bg-blue-100 text-blue-700 border-none px-3 font-bold uppercase text-[9px]">Open</Badge>;
    }
  };

  if (isUserLoading || isProfileLoading) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="bg-white border-b py-8 px-6">
        <div className="container mx-auto space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="space-y-1 text-center lg:text-left">
              <h1 className="text-3xl font-headline font-bold">Community Requests</h1>
              <p className="text-slate-500 text-sm">Monitor and moderate all active community needs.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Filter by title..." 
                  className="pl-11 h-11 bg-slate-50 border-none rounded-xl w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select className="text-xs font-bold bg-transparent outline-none cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Any Status</option>
                <option value="open">Open</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
              <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
              <select className="text-xs font-bold bg-transparent outline-none cursor-pointer" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">Any Category</option>
                <option value="blood">Blood</option>
                <option value="tutor">Tutoring</option>
                <option value="repair">Repair</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 h-8 px-4 font-bold rounded-xl">
              Total Found: {filteredRequests.length}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto py-8">
        <Card className="border-none shadow-sm overflow-hidden bg-white rounded-2xl">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100">
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 pl-8">Request Title</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Category</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Status</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Posted By</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Date</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isRequestsLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400">Loading missions...</TableCell></TableRow>
              ) : filteredRequests.map((r) => (
                <TableRow key={r.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <TableCell className="py-4 pl-8">
                    <div className="flex flex-col min-w-[200px]">
                      <span className="font-bold text-slate-900 truncate">{r.title}</span>
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">{r.urgency} Urgency</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-xs font-bold text-slate-600">
                    {r.category}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(r.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px] font-bold">{r.postedByName?.[0]}</AvatarFallback></Avatar>
                      <span className="text-xs font-bold text-slate-700">{r.postedByName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium">
                    {r.createdAt ? format(r.createdAt.toDate(), 'MMM dd, HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="right" className="rounded-2xl w-56 p-2 shadow-2xl">
                        <DropdownMenuItem className="rounded-xl gap-2 font-bold cursor-pointer">
                          <Eye className="w-4 h-4" /> View Details
                        </DropdownMenuItem>
                        {r.status !== 'completed' && (
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold text-emerald-600 cursor-pointer" onClick={() => handleForceComplete(r.id)}>
                            <CheckCircle2 className="w-4 h-4" /> Force Complete
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="rounded-xl gap-2 font-bold text-amber-600 cursor-pointer">
                          <Calendar className="w-4 h-4" /> Extend Expiry
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="rounded-xl gap-2 font-bold text-red-600 cursor-pointer" onClick={() => handleDeleteRequest(r.id)}>
                          <Trash2 className="w-4 h-4" /> Delete Request
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
    </div>
  );
}
