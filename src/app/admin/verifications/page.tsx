"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, where, doc } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ShieldCheck,
  XCircle,
  Clock,
  Briefcase,
  MapPin,
  CheckCircle2,
  Phone,
  Inbox,
  Activity,
  Loader2,
  FileText,
  AlertTriangle,
  History
} from "lucide-react";
import { format } from "date-fns";
import { sendNotification } from "@/firebase/notifications";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function PendingVerifications() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("pending");
  const [rejectingUser, setRejectingUser] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  const providersQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(collection(db, "users"), where("role", "==", "provider"));
  }, [db, profile?.role]);
  const { data: rawProviders, isLoading: isPendingLoading } = useCollection(providersQuery);

  const pendingUsers = useMemo(() => {
    if (!rawProviders) return [];
    return [...rawProviders]
      .filter(u => u.verified === false)
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawProviders]);

  const processedUsers = useMemo(() => {
    if (!rawProviders) return [];
    return [...rawProviders]
      .filter(u => u.verified === true)
      .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
      .slice(0, 20);
  }, [rawProviders]);

  const handleVerify = async (u: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "users", u.id), { 
      verified: true,
      updatedAt: new Date()
    });
    
    await sendNotification(db, u.id, {
      title: "🎉 Expert Profile Verified!",
      message: "Your application has been approved! You can now accept community jobs on HelpLink.",
      type: "system",
      link: "/dashboard"
    });

    toast({ title: "Expert Approved", description: `${u.name} is now a verified provider.` });
  };

  const handleReject = async () => {
    if (!db || !rejectingUser) return;
    
    await sendNotification(db, rejectingUser.id, {
      title: "Verification Update Required",
      message: `Your expert verification was not approved. Reason: ${rejectReason}`,
      type: "system",
      link: "/provider/profile"
    });

    toast({ variant: "destructive", title: "Verification Rejected", description: "Feedback sent to the user." });
    setRejectingUser(null);
    setRejectReason("");
  };

  if (isUserLoading || isProfileLoading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1E]"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-50 pb-20">
      <header className="bg-[#1A1F35] border-b border-white/5 py-8 px-6">
        <div className="container mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-headline font-bold flex items-center gap-3 text-white">
                <ShieldCheck className="w-8 h-8 text-primary" /> Provider Approvals
              </h1>
              <p className="text-slate-400 text-sm font-medium">Review and verify professional applications for expert status.</p>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="bg-white/5 border border-white/5 p-1 rounded-xl h-11">
                <TabsTrigger value="pending" className="rounded-lg font-bold px-6 data-[state=active]:bg-primary gap-2">
                  <Clock className="w-4 h-4" /> Pending ({pendingUsers.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg font-bold px-6 data-[state=active]:bg-primary gap-2">
                  <History className="w-4 h-4" /> Recent History
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto py-10">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="pending" className="mt-0">
            {isPendingLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : pendingUsers.length === 0 ? (
              <div className="py-32 text-center bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10 space-y-4 max-w-xl mx-auto shadow-sm">
                <Inbox className="w-16 h-16 text-white/5 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Queue Clear</h3>
                  <p className="text-slate-500">All expert applications have been processed.</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                {pendingUsers.map((u) => (
                  <Card key={u.id} className="rounded-[2rem] border-none shadow-xl bg-[#1A1F35] overflow-hidden flex flex-col group hover:shadow-primary/5 transition-all">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-none font-bold uppercase text-[9px] px-3">
                          {u.serviceCategory || "Professional"}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 uppercase tracking-tight">
                          <Clock className="w-3 h-3" /> {u.createdAt ? format(u.createdAt.toDate(), 'MMM dd') : 'New'}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 ring-4 ring-white/5 shadow-sm">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} />
                          <AvatarFallback className="bg-primary text-white font-bold text-xl">{u.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <CardTitle className="text-xl font-headline font-bold leading-tight truncate text-slate-200">{u.name}</CardTitle>
                          <p className="text-xs text-slate-500 font-medium truncate">{u.email}</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-grow space-y-6">
                      <div className="p-4 bg-white/5 rounded-2xl space-y-3 border border-white/5">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                          <Briefcase className="w-3.5 h-3.5 text-primary" /> {u.experience || "Entry Level"} Experience
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-primary" /> {u.serviceArea || "Campus-wide"}
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                            <Phone className="w-3.5 h-3.5 text-primary" /> {u.phone}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Submitted Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {u.skills?.length > 0 ? u.skills.map((s: string) => (
                            <Badge key={s} className="bg-white/5 text-slate-400 border border-white/10 text-[10px] font-bold px-2 py-0">
                              {s}
                            </Badge>
                          )) : <span className="text-[10px] text-slate-700 italic">No specific tags provided</span>}
                        </div>
                      </div>

                      <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Docs Verified in Stage 1</span>
                      </div>
                    </CardContent>

                    <CardFooter className="p-6 pt-0 bg-white/[0.02] border-t border-white/5 flex gap-3">
                      <Button 
                        variant="ghost" 
                        className="flex-1 rounded-xl font-bold text-rose-400 h-11 hover:bg-rose-50/10"
                        onClick={() => setRejectingUser(u)}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                      <Button 
                        className="flex-1 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white h-11 shadow-lg shadow-emerald-500/20"
                        onClick={() => handleVerify(u)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <Card className="bg-[#1A1F35] border-none shadow-xl rounded-[2rem] overflow-hidden">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5">
                    <TableHead className="pl-8 h-14 text-[10px] font-black uppercase tracking-widest text-slate-500">Expert</TableHead>
                    <TableHead className="h-14 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</TableHead>
                    <TableHead className="h-14 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</TableHead>
                    <TableHead className="h-14 text-[10px] font-black uppercase tracking-widest text-slate-500">Processed On</TableHead>
                    <TableHead className="pr-8 h-14 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedUsers.map((u) => (
                    <TableRow key={u.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-white/10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} />
                            <AvatarFallback>{u.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-slate-200">{u.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase">{u.serviceCategory}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] font-black uppercase">Approved</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {u.updatedAt ? format(u.updatedAt.toDate(), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                        <Button variant="ghost" size="sm" className="rounded-lg font-bold text-rose-400 hover:bg-rose-500/10 h-8" onClick={() => updateDocumentNonBlocking(doc(db, "users", u.id), { verified: false })}>
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* REJECT DIALOG */}
      <Dialog open={!!rejectingUser} onOpenChange={(val) => !val && setRejectingUser(null)}>
        <DialogContent className="rounded-3xl p-8 border-none bg-[#1A1F35] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <AlertTriangle className="text-orange-400 w-6 h-6" /> Decline Application
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Provide constructive feedback to <strong>{rejectingUser?.name}</strong>. They will be notified to update their profile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase text-slate-500 tracking-widest">Reason for Rejection</Label>
              <Textarea 
                placeholder="e.g. Missing valid ID proof, incomplete experience details..."
                className="min-h-[120px] rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-700"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" className="rounded-xl font-bold border-white/10" onClick={() => setRejectingUser(null)}>Cancel</Button>
            <Button className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/20" disabled={!rejectReason} onClick={handleReject}>Send Feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
