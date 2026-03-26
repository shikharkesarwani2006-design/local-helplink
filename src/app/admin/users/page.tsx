
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { query, collection, doc } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  UserCheck,
  UserX,
  ShieldCheck,
  MoreVertical,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Eye,
  ShieldAlert,
  Users,
  Wrench,
  Trophy,
  Shield,
  Clock,
  Phone,
  Mail,
  MapPin,
  Star,
  CheckCircle2,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const UserRow = React.memo(({ u, onUpdate, onWarn, onSuspend, onView }: any) => {
  return (
    <TableRow className={cn(
      "border-white/5 hover:bg-white/[0.02] transition-colors",
      u.suspended && "bg-rose-500/5"
    )}>
      <TableCell className="py-4 pl-8">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-white/10">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{u.name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-slate-200 flex items-center gap-2">
              {u.name}
              {u.suspended && <Badge variant="destructive" className="h-4 text-[8px] px-1.5 font-black">BANNED</Badge>}
            </span>
            <span className="text-xs text-slate-500 font-medium">{u.email}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={cn("uppercase text-[9px] font-black text-white border-none h-5", 
          u.role === 'admin' ? "bg-rose-500" : 
          u.role === 'provider' ? "bg-amber-500" : 
          u.role === 'volunteer' ? "bg-purple-500" : "bg-blue-500"
        )}>
          {u.role}
        </Badge>
      </TableCell>
      <TableCell>
        {u.verified ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
            <ShieldCheck className="w-3 h-3" /> Verified
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 text-slate-500 text-[10px] font-black uppercase">
            Pending
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-sm font-black text-slate-200">{u.rating?.toFixed(1) || "5.0"}</span>
        </div>
      </TableCell>
      <TableCell className="text-xs text-slate-500 font-bold uppercase tracking-tight">
        {u.createdAt ? format(u.createdAt.toDate(), 'MMM dd, yyyy') : '-'}
      </TableCell>
      <TableCell className="text-right pr-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-slate-600"><MoreVertical className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="right" className="rounded-2xl w-56 p-2 shadow-2xl border-none bg-[#1A1F35]">
            <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 px-3">System Actions</DropdownMenuLabel>
            <DropdownMenuItem className="rounded-xl gap-2 font-bold cursor-pointer text-slate-200" onClick={() => onView(u)}>
              <Eye className="w-4 h-4 text-primary" /> View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-xl gap-2 font-bold text-slate-200">
                <RefreshCw className="w-4 h-4 text-indigo-400" /> Adjust Role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="rounded-xl p-2 min-w-[160px] bg-[#1A1F35] border-none shadow-2xl">
                {['user', 'volunteer', 'provider', 'admin'].map(role => (
                  <DropdownMenuItem key={role} className="rounded-lg font-bold cursor-pointer gap-2 capitalize text-slate-300" onClick={() => onUpdate(u.id, { role })}>
                    <div className={cn("w-2 h-2 rounded-full", role === 'admin' ? "bg-rose-500" : role === 'provider' ? "bg-amber-500" : role === 'volunteer' ? "bg-purple-500" : "bg-blue-500")} />
                    Make {role}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {!u.verified ? (
              <DropdownMenuItem className="rounded-xl gap-2 font-bold text-emerald-400 cursor-pointer" onClick={() => onUpdate(u.id, { verified: true })}>
                <UserCheck className="w-4 h-4" /> Grant Verification
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="rounded-xl gap-2 font-bold text-rose-400 cursor-pointer" onClick={() => onUpdate(u.id, { verified: false })}>
                <UserX className="w-4 h-4" /> Revoke Verification
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem className="rounded-xl gap-2 font-bold text-rose-500 cursor-pointer" onClick={() => onSuspend(u)}>
              <ShieldAlert className="w-4 h-4" /> {u.suspended ? "Unban Account" : "Suspend Account"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});
UserRow.displayName = "UserRow";

export default function CitizenDirectory() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewUser, setViewUser] = useState<any>(null);
  const [suspendUser, setSuspendUser] = useState<any>(null);

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
    return query(collection(db, "users"));
  }, [db, profile?.role]);
  const { data: rawUsers, isLoading: isUsersLoading } = useCollection(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!rawUsers) return [];
    return [...rawUsers]
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      .filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             u.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || u.role === activeTab;
        return matchesSearch && matchesTab;
      });
  }, [rawUsers, searchQuery, activeTab]);

  const stats = useMemo(() => {
    if (!rawUsers) return { total: 0, admin: 0, volunteer: 0, provider: 0, user: 0 };
    return {
      total: rawUsers.length,
      admin: rawUsers.filter(u => u.role === 'admin').length,
      volunteer: rawUsers.filter(u => u.role === 'volunteer').length,
      provider: rawUsers.filter(u => u.role === 'provider').length,
      user: rawUsers.filter(u => u.role === 'user').length,
    };
  }, [rawUsers]);

  const handleUpdateUser = useCallback((userId: string, data: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "users", userId), data);
    toast({ title: "Update Successful", description: "Citizen record has been modified." });
  }, [db, toast]);

  const handleSuspend = useCallback(async () => {
    if (!db || !suspendUser) return;
    const isSuspended = !!suspendUser.suspended;
    updateDocumentNonBlocking(doc(db, "users", suspendUser.id), { suspended: !isSuspended });
    toast({ 
      variant: isSuspended ? "default" : "destructive", 
      title: isSuspended ? "Account Restored" : "Account Suspended", 
      description: `${suspendUser.name} status updated.` 
    });
    setSuspendUser(null);
  }, [db, suspendUser, toast]);

  if (isUserLoading || isProfileLoading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1E]"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-50 pb-20">
      <header className="bg-[#1A1F35] border-b border-white/5 py-8 px-6">
        <div className="container mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h1 className="text-3xl font-headline font-bold text-white">Citizen Directory</h1>
              <p className="text-slate-400 text-sm font-medium">Manage neighborhood members and system permissions.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-11 h-11 bg-white/5 border-white/5 rounded-xl w-full text-white placeholder:text-slate-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
              <TabsList className="bg-white/5 border border-white/5 p-1 rounded-xl h-11">
                <TabsTrigger value="all" className="rounded-lg font-bold px-4 data-[state=active]:bg-primary">All Hub</TabsTrigger>
                <TabsTrigger value="user" className="rounded-lg font-bold px-4 gap-2 data-[state=active]:bg-primary"><Users className="w-3.5 h-3.5" /> Citizens</TabsTrigger>
                <TabsTrigger value="volunteer" className="rounded-lg font-bold px-4 gap-2 data-[state=active]:bg-primary"><Trophy className="w-3.5 h-3.5" /> Volunteers</TabsTrigger>
                <TabsTrigger value="provider" className="rounded-lg font-bold px-4 gap-2 data-[state=active]:bg-primary"><Wrench className="w-3.5 h-3.5" /> Experts</TabsTrigger>
                <TabsTrigger value="admin" className="rounded-lg font-bold px-4 gap-2 data-[state=active]:bg-primary"><Shield className="w-3.5 h-3.5" /> Admins</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-6 py-3 rounded-xl border border-white/5 shadow-sm">
              <span>{stats.total} Total</span>
              <span className="text-white/10">|</span>
              <span className="text-rose-400">{stats.admin} Admin</span>
              <span className="text-white/10">|</span>
              <span className="text-purple-400">{stats.volunteer} Volunteer</span>
              <span className="text-white/10">|</span>
              <span className="text-amber-400">{stats.provider} Expert</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto py-8">
        <Card className="border-none shadow-xl overflow-hidden bg-[#1A1F35] rounded-[2rem]">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 pl-8 text-slate-500">Citizen</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-slate-500">Role</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-slate-500">Verification</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-slate-500">Trust Score</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-slate-500">Joined</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-right pr-8 text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isUsersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-white/5">
                    <TableCell className="pl-8 py-4"><Skeleton className="h-10 w-40 animate-pulse rounded-lg bg-white/5" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 animate-pulse rounded-full bg-white/5" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 animate-pulse rounded-full bg-white/5" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12 animate-pulse rounded-full bg-white/5" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32 animate-pulse rounded-lg bg-white/5" /></TableCell>
                    <TableCell className="text-right pr-8"><Skeleton className="h-8 w-8 animate-pulse rounded-full ml-auto bg-white/5" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.map((u) => (
                <UserRow 
                  key={u.id} 
                  u={u} 
                  onUpdate={handleUpdateUser} 
                  onSuspend={setSuspendUser} 
                  onView={setViewUser} 
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>

      <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none bg-[#0A0F1E] shadow-2xl">
          {viewUser && (
            <div className="flex flex-col">
              <div className="bg-[#1A1F35] p-8 text-white relative border-b border-white/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                <div className="flex items-center gap-6 relative z-10">
                  <Avatar className="h-20 w-20 border-4 border-white/10 shadow-2xl">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${viewUser.email}`} />
                    <AvatarFallback className="bg-primary text-white text-2xl font-bold">{viewUser.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <DialogTitle className="text-3xl font-headline font-bold">{viewUser.name}</DialogTitle>
                    <div className="flex gap-2">
                      <Badge className="bg-primary text-white border-none uppercase text-[9px] font-black h-5">{viewUser.role}</Badge>
                      {viewUser.verified && <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-2 h-5 text-[8px] font-black uppercase">Verified Member</Badge>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Profile Data</h4>
                    <div className="space-y-3">
                      <p className="text-sm font-medium flex items-center gap-3 text-slate-400"><Mail className="w-4 h-4 text-primary" /> {viewUser.email}</p>
                      <p className="text-sm font-medium flex items-center gap-3 text-slate-400"><Phone className="w-4 h-4 text-primary" /> {viewUser.phone || "Not Linked"}</p>
                      <p className="text-sm font-medium flex items-center gap-3 text-slate-400"><MapPin className="w-4 h-4 text-primary" /> {viewUser.location?.area || "Area Unknown"}</p>
                      <p className="text-sm font-medium flex items-center gap-3 text-slate-400"><Clock className="w-4 h-4 text-primary" /> Member Since {viewUser.createdAt ? format(viewUser.createdAt.toDate(), 'MMM yyyy') : 'Recent'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Reputation</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400 mb-1" />
                        <p className="text-xl font-black text-white">{viewUser.rating?.toFixed(1) || "5.0"}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Avg Rating</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
                        <p className="text-xl font-black text-white">{viewUser.totalHelped || 0}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Missions</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Skills & Expertise</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {viewUser.skills?.length > 0 ? viewUser.skills.map((s: string) => (
                        <Badge key={s} variant="outline" className="bg-white/5 text-slate-300 border-white/5 font-bold text-[10px] h-6">{s}</Badge>
                      )) : <p className="text-xs text-slate-600 italic">No expertise listed.</p>}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Citizen Bio</h4>
                    <p className="text-sm text-slate-500 italic leading-relaxed">"{viewUser.bio || "No biography provided by this member."}"</p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end">
                <Button variant="outline" className="rounded-xl font-bold border-white/10" onClick={() => setViewUser(null)}>Dismiss Viewer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!suspendUser} onOpenChange={(val) => !val && setSuspendUser(null)}>
        <AlertDialogContent className="rounded-[2rem] p-8 border-none bg-[#1A1F35] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold flex items-center gap-3">
              <ShieldAlert className={cn("w-6 h-6", suspendUser?.suspended ? "text-emerald-400" : "text-rose-500")} />
              {suspendUser?.suspended ? "Restore Account?" : "Restrict Citizen?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-400">
              {suspendUser?.suspended 
                ? `Are you sure you want to restore access for ${suspendUser?.name}? They will be able to post and accept missions again.` 
                : `Suspend ${suspendUser?.name}? They will lose all platform access and active missions will be flagged.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl font-bold border-white/10 bg-white/5 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className={cn("rounded-xl font-bold", suspendUser?.suspended ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600")} 
              onClick={handleSuspend}
            >
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
