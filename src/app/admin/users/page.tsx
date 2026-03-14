"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, doc, writeBatch } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
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
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle2
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
import { sendNotification } from "@/firebase/notifications";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function CitizenDirectory() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [viewUser, setViewUser] = useState<any>(null);
  const [warnUser, setWarnUser] = useState<any>(null);
  const [warningMessage, setWarningMessage] = useState("");
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

  // REMOVED orderBy to avoid index
  const usersQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "users"));
  }, [db, profile?.role]);
  const { data: rawUsers, isLoading: isUsersLoading } = useCollection(usersQuery);

  // SORT AND FILTER IN JS
  const filteredUsers = useMemo(() => {
    if (!rawUsers) return [];
    const seenEmails = new Set();
    return [...rawUsers]
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      .filter(u => {
        if (seenEmails.has(u.email)) return false;
        seenEmails.add(u.email);
        return true;
      })
      .filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             u.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || u.role === activeTab;
        return matchesSearch && matchesTab;
      });
  }, [rawUsers, searchQuery, activeTab]);

  const stats = useMemo(() => {
    if (!rawUsers) return { total: 0, admin: 0, volunteer: 0, provider: 0, user: 0 };
    const seenEmails = new Set();
    const uniqueUsers = rawUsers.filter(u => {
      if (seenEmails.has(u.email)) return false;
      seenEmails.add(u.email);
      return true;
    });

    return {
      total: uniqueUsers.length,
      admin: uniqueUsers.filter(u => u.role === 'admin').length,
      volunteer: uniqueUsers.filter(u => u.role === 'volunteer').length,
      provider: uniqueUsers.filter(u => u.role === 'provider').length,
      user: uniqueUsers.filter(u => u.role === 'user').length,
    };
  }, [rawUsers]);

  const handleUpdateUser = (userId: string, data: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "users", userId), data);
    toast({ title: "User Updated", description: "Account record has been modified." });
  };

  const handleSendWarning = async () => {
    if (!db || !warnUser || !warningMessage) return;
    await sendNotification(db, warnUser.id, {
      title: "⚠️ Official Admin Warning",
      message: "Admin Warning: " + warningMessage,
      type: "system",
      link: "/profile"
    });
    toast({ title: "Warning Sent", description: `A formal alert was sent to ${warnUser.name}.` });
    setWarnUser(null);
    setWarningMessage("");
  };

  const handleSuspend = async () => {
    if (!db || !suspendUser) return;
    updateDocumentNonBlocking(doc(db, "users", suspendUser.id), { suspended: true });
    toast({ variant: "destructive", title: "Account Suspended", description: `${suspendUser.name} no longer has platform access.` });
    setSuspendUser(null);
  };

  const cleanDuplicates = async () => {
    if (!db || !rawUsers) return;
    setCleaning(true);
    try {
      const emailMap = new Map();
      const duplicatesToDelete: string[] = [];

      rawUsers.forEach(u => {
        if (emailMap.has(u.email)) {
          duplicatesToDelete.push(u.id);
        } else {
          emailMap.set(u.email, u.id);
        }
      });

      if (duplicatesToDelete.length === 0) {
        toast({ title: "No Duplicates Found", description: "Database is already clean." });
        return;
      }

      const batch = writeBatch(db);
      duplicatesToDelete.forEach(id => batch.delete(doc(db, "users", id)));
      await batch.commit();

      toast({ title: "Cleanup Success", description: `Removed ${duplicatesToDelete.length} duplicate accounts.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Cleanup Failed" });
    } finally {
      setCleaning(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-red-500 text-white border-none uppercase text-[9px] font-black">Admin</Badge>;
      case 'provider': return <Badge className="bg-amber-500 text-white border-none uppercase text-[9px] font-black">Provider</Badge>;
      case 'volunteer': return <Badge className="bg-purple-500 text-white border-none uppercase text-[9px] font-black">Volunteer</Badge>;
      default: return <Badge className="bg-blue-500 text-white border-none uppercase text-[9px] font-black">User</Badge>;
    }
  };

  if (isUserLoading || isProfileLoading) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="bg-white border-b py-8 px-6">
        <div className="container mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h1 className="text-3xl font-headline font-bold">Citizen Directory</h1>
              <p className="text-slate-500 text-sm">Manage neighborhood members and account permissions.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="rounded-xl font-bold h-11 gap-2 border-slate-200"
                onClick={cleanDuplicates}
                disabled={cleaning}
              >
                {cleaning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
                Clean Duplicates
              </Button>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search by name or email..." 
                  className="pl-11 h-11 bg-slate-50 border-none rounded-xl w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
              <TabsList className="bg-slate-100/50 p-1 rounded-xl h-11">
                <TabsTrigger value="all" className="rounded-lg font-bold px-4">All</TabsTrigger>
                <TabsTrigger value="user" className="rounded-lg font-bold px-4 gap-2"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
                <TabsTrigger value="volunteer" className="rounded-lg font-bold px-4 gap-2"><Trophy className="w-3.5 h-3.5" /> Volunteers</TabsTrigger>
                <TabsTrigger value="provider" className="rounded-lg font-bold px-4 gap-2"><Wrench className="w-3.5 h-3.5" /> Providers</TabsTrigger>
                <TabsTrigger value="admin" className="rounded-lg font-bold px-4 gap-2"><Shield className="w-3.5 h-3.5" /> Admins</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-6 py-3 rounded-xl border shadow-sm">
              <span>{stats.total} Total</span>
              <span className="text-slate-200">|</span>
              <span className="text-red-500">{stats.admin} Admin</span>
              <span className="text-slate-200">|</span>
              <span className="text-purple-500">{stats.volunteer} Volunteer</span>
              <span className="text-slate-200">|</span>
              <span className="text-amber-500">{stats.provider} Provider</span>
              <span className="text-slate-200">|</span>
              <span className="text-blue-500">{stats.user} Users</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto py-8">
        <Card className="border-none shadow-sm overflow-hidden bg-white rounded-2xl">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100">
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 pl-8">Citizen</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Role</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Verification</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14">Joined</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest h-14 text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isUsersLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400">Loading directory...</TableCell></TableRow>
              ) : filteredUsers.map((u) => (
                <TableRow key={u.id} className={cn(
                  "border-slate-50 hover:bg-slate-50/30 transition-colors",
                  u.suspended && "bg-red-50/50"
                )}>
                  <TableCell className="py-4 pl-8">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{u.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 flex items-center gap-2">
                          {u.name}
                          {u.suspended && <Badge variant="destructive" className="h-4 text-[8px] px-1 font-black">SUSPENDED</Badge>}
                        </span>
                        <span className="text-xs text-slate-400">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(u.role)}
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
                  <TableCell className="text-xs text-slate-500 font-medium">
                    {u.createdAt ? format(u.createdAt.toDate(), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="right" className="rounded-2xl w-56 p-2 shadow-2xl">
                        <DropdownMenuLabel className="text-xs font-black uppercase text-slate-400 px-3">Citizen Actions</DropdownMenuLabel>
                        
                        <DropdownMenuItem className="rounded-xl gap-2 font-bold cursor-pointer" onClick={() => setViewUser(u)}>
                          <Eye className="w-4 h-4" /> View Full Profile
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />

                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="rounded-xl gap-2 font-bold">
                            <RefreshCw className="w-4 h-4" /> Change Role
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="rounded-xl p-2 min-w-[160px]">
                            <DropdownMenuItem className="rounded-lg font-bold cursor-pointer gap-2" onClick={() => handleUpdateUser(u.id, { role: 'user' })}>
                              <div className="w-2 h-2 rounded-full bg-blue-500" /> Make User
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg font-bold cursor-pointer gap-2" onClick={() => handleUpdateUser(u.id, { role: 'volunteer' })}>
                              <div className="w-2 h-2 rounded-full bg-purple-500" /> Make Volunteer
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg font-bold cursor-pointer gap-2" onClick={() => handleUpdateUser(u.id, { role: 'provider' })}>
                              <div className="w-2 h-2 rounded-full bg-amber-500" /> Make Provider
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg font-bold cursor-pointer gap-2" onClick={() => handleUpdateUser(u.id, { role: 'admin' })}>
                              <div className="w-2 h-2 rounded-full bg-red-500" /> Make Admin
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {!u.verified ? (
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold text-emerald-600 cursor-pointer" onClick={() => handleUpdateUser(u.id, { verified: true })}>
                            <UserCheck className="w-4 h-4" /> Verify Account
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold text-red-600 cursor-pointer" onClick={() => handleUpdateUser(u.id, { verified: false })}>
                            <UserX className="w-4 h-4" /> Revoke Verification
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem className="rounded-xl gap-2 font-bold text-amber-600 cursor-pointer" onClick={() => setWarnUser(u)}>
                          <AlertTriangle className="w-4 h-4" /> Warn User
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem className="rounded-xl gap-2 font-bold text-red-600 cursor-pointer" onClick={() => setSuspendUser(u)}>
                          <ShieldAlert className="w-4 h-4" /> Suspend Account
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

      <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden">
          {viewUser && (
            <div className="flex flex-col">
              <div className="bg-slate-900 p-8 text-white relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                <div className="flex items-center gap-6 relative z-10">
                  <Avatar className="h-20 w-20 border-4 border-white/10 shadow-2xl">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${viewUser.email}`} />
                    <AvatarFallback className="bg-primary text-white text-2xl font-bold">{viewUser.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <DialogTitle className="text-3xl font-headline font-bold">{viewUser.name}</DialogTitle>
                    <div className="flex gap-2">
                      {getRoleBadge(viewUser.role)}
                      {viewUser.verified && <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-2 h-5 text-[8px] font-black uppercase">Verified Expert</Badge>}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8 grid md:grid-cols-2 gap-8 bg-white">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Personal Details</h4>
                    <div className="space-y-3">
                      <p className="text-sm font-medium flex items-center gap-3 text-slate-600"><Mail className="w-4 h-4 text-primary" /> {viewUser.email}</p>
                      <p className="text-sm font-medium flex items-center gap-3 text-slate-600"><Phone className="w-4 h-4 text-primary" /> {viewUser.phone || "No phone added"}</p>
                      <p className="text-sm font-medium flex items-center gap-3 text-slate-600"><MapPin className="w-4 h-4 text-primary" /> {viewUser.location?.area || "No area set"}</p>
                      <p className="text-sm font-medium flex items-center gap-3 text-slate-600"><Clock className="w-4 h-4 text-primary" /> Joined {format(viewUser.createdAt?.toDate(), 'MMM yyyy')}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Reputation</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400 mb-1" />
                        <p className="text-xl font-black text-slate-900">{viewUser.rating?.toFixed(1) || "5.0"}</p>
                        <p className="text-[8px] font-bold text-amber-600 uppercase">Avg Rating</p>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1" />
                        <p className="text-xl font-black text-slate-900">{viewUser.totalHelped || 0}</p>
                        <p className="text-[8px] font-bold text-emerald-600 uppercase">Missions</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Expertise</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {viewUser.skills?.length > 0 ? viewUser.skills.map((s: string) => (
                        <Badge key={s} variant="secondary" className="bg-slate-50 text-slate-600 border font-bold text-[10px]">{s}</Badge>
                      )) : <p className="text-xs text-slate-400 italic">No specific skills listed.</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Bio</h4>
                    <p className="text-sm text-slate-500 italic leading-relaxed">
                      "{viewUser.bio || "No biography provided by this neighborhood member."}"
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 border-t flex justify-end">
                <Button variant="outline" className="rounded-xl font-bold" onClick={() => setViewUser(null)}>Dismiss Details</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!warnUser} onOpenChange={() => setWarnUser(null)}>
        <DialogContent className="rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="text-amber-500 w-6 h-6" /> Issue System Warning
            </DialogTitle>
            <DialogDescription>
              Sending a warning to <strong>{warnUser?.name}</strong>. They will receive a notification in their activity feed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Warning Details</Label>
              <Textarea 
                placeholder="Describe the policy violation or reason for warning..."
                className="min-h-[120px] rounded-2xl resize-none"
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setWarnUser(null)}>Cancel</Button>
            <Button 
              className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!warningMessage}
              onClick={handleSendWarning}
            >
              Issue Formal Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!suspendUser} onOpenChange={setSuspendUser}>
        <AlertDialogContent className="rounded-[2rem] p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-red-600">Suspend Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to suspend <strong>{suspendUser?.name}</strong>? This will revoke all platform access and mark the account as restricted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl font-bold">Nevermind</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl font-bold bg-red-600 hover:bg-red-700" onClick={handleSuspend}>
              Yes, Suspend Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
