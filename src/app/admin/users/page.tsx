"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, orderBy, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  UserCheck,
  UserX,
  ShieldCheck,
  MoreVertical,
  Trash2,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  Eye,
  ShieldAlert
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

export default function CitizenDirectory() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [cleaning, setCleaning] = useState(false);

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
    return query(collection(db, "users"), orderBy("createdAt", "desc"));
  }, [db, profile?.role]);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection(usersQuery);

  // Deduplication logic for frontend view
  const dedupedUsers = useMemo(() => {
    if (!allUsers) return [];
    const seenEmails = new Set();
    return allUsers.filter(u => {
      if (seenEmails.has(u.email)) return false;
      seenEmails.add(u.email);
      return true;
    }).filter(u => 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allUsers, searchQuery]);

  const handleUpdateUser = (userId: string, data: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "users", userId), data);
    toast({ title: "User Updated", description: "The citizen record has been modified." });
  };

  const handleWarnUser = async (u: any) => {
    if (!db) return;
    await sendNotification(db, u.id, {
      title: "⚠️ Official Warning",
      message: "An admin has issued a warning regarding your community activity. Please review the safety guidelines.",
      type: "system",
      link: "/profile"
    });
    toast({ title: "Warning Sent", description: `A notification was sent to ${u.name}.` });
  };

  const cleanDuplicates = async () => {
    if (!db || !allUsers) return;
    setCleaning(true);
    try {
      const emailMap = new Map();
      const duplicatesToDelete: string[] = [];

      allUsers.forEach(u => {
        if (emailMap.has(u.email)) {
          // Keep the newer one (allUsers is ordered by createdAt desc, so newer is first)
          // The later ones in loop are older
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
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
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
                placeholder="Search citizens..." 
                className="pl-11 h-11 bg-slate-50 border-none rounded-xl w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
              ) : dedupedUsers.map((u) => (
                <TableRow key={u.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <TableCell className="py-4 pl-8">
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
                        <DropdownMenuItem className="rounded-xl gap-2 font-bold cursor-pointer" onClick={() => router.push(`/profile?id=${u.id}`)}>
                          <Eye className="w-4 h-4" /> View Profile
                        </DropdownMenuItem>
                        
                        {!u.verified ? (
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold text-emerald-600 cursor-pointer" onClick={() => handleUpdateUser(u.id, { verified: true })}>
                            <UserCheck className="w-4 h-4" /> Verify Account
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="rounded-xl gap-2 font-bold text-red-600 cursor-pointer" onClick={() => handleUpdateUser(u.id, { verified: false })}>
                            <UserX className="w-4 h-4" /> Revoke Verification
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="rounded-xl gap-2 font-bold">
                            <RefreshCw className="w-4 h-4" /> Change Role
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="rounded-xl p-2 min-w-[140px]">
                            {['user', 'volunteer', 'provider', 'admin'].map(r => (
                              <DropdownMenuItem key={r} className="rounded-lg capitalize font-bold cursor-pointer" onClick={() => handleUpdateUser(u.id, { role: r })}>
                                {r}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuItem className="rounded-xl gap-2 font-bold text-amber-600 cursor-pointer" onClick={() => handleWarnUser(u)}>
                          <AlertTriangle className="w-4 h-4" /> Warn User
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem className="rounded-xl gap-2 font-bold text-red-600 cursor-pointer">
                          <Trash2 className="w-4 h-4" /> Suspend Account
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