
"use client";

import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { query, collection, where, doc } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  ShieldCheck,
  XCircle,
  Clock,
  Briefcase,
  MapPin,
  CheckCircle2,
  Phone,
  Inbox,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { sendNotification } from "@/firebase/notifications";

export default function PendingVerifications() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

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

  // Removed orderBy to avoid index
  const pendingQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(
      collection(db, "users"), 
      where("role", "==", "provider"), 
      where("verified", "==", false)
    );
  }, [db, profile?.role]);
  const { data: rawPendingUsers, isLoading: isPendingLoading } = useCollection(pendingQuery);

  const pendingUsers = useMemo(() => {
    if (!rawPendingUsers) return null;
    return [...rawPendingUsers].sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });
  }, [rawPendingUsers]);

  const handleVerify = async (u: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "users", u.id), { verified: true });
    
    await sendNotification(db, u.id, {
      title: "🎉 Account Verified!",
      message: "Your professional profile has been approved! You can now accept community jobs on HelpLink.",
      type: "system",
      link: "/dashboard"
    });

    toast({ title: "Expert Verified", description: `${u.name} is now a verified provider.` });
  };

  const handleReject = async (u: any) => {
    if (!db) return;
    await sendNotification(db, u.id, {
      title: "Verification Update",
      message: "Your expert verification was not approved. Please update your service details and reapply.",
      type: "system",
      link: "/provider/profile"
    });
    toast({ variant: "destructive", title: "Verification Rejected" });
  };

  if (isUserLoading || isProfileLoading) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="bg-white border-b py-8 px-6">
        <div className="container mx-auto space-y-1">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" /> Provider Approvals
          </h1>
          <p className="text-slate-500 text-sm">Review professional applications for campus expert status.</p>
        </div>
      </header>

      <main className="container px-6 mx-auto py-8">
        {isPendingLoading ? (
          <div className="flex justify-center py-20"><Activity className="animate-spin text-primary" /></div>
        ) : !pendingUsers || pendingUsers.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed space-y-4 max-w-xl mx-auto shadow-sm">
            <Inbox className="w-16 h-16 text-slate-200 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Zero Pending Requests</h3>
              <p className="text-slate-500">All expert applications have been processed.</p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
            {pendingUsers.map((u) => (
              <Card key={u.id} className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden flex flex-col group hover:shadow-2xl transition-all">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="bg-slate-50 text-slate-400 border-none font-bold uppercase text-[9px] px-3">
                      {u.serviceCategory || "Professional"}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                      <Clock className="w-3 h-3" /> {u.createdAt ? format(u.createdAt.toDate(), 'MMM dd') : 'New'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-4 ring-slate-50 shadow-sm">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">{u.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <CardTitle className="text-xl font-headline font-bold leading-tight truncate max-w-[180px]">{u.name}</CardTitle>
                      <p className="text-xs text-slate-400 font-medium truncate max-w-[180px]">{u.email}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-grow space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                      <Briefcase className="w-3.5 h-3.5 text-primary" /> {u.experience || "Entry Level"} Experience
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {u.serviceArea || "Campus-wide"}
                    </div>
                    {u.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                        <Phone className="w-3.5 h-3.5 text-primary" /> {u.phone}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Expertise Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {u.skills?.length > 0 ? u.skills.map((s: string) => (
                        <Badge key={s} className="bg-white text-slate-600 border border-slate-100 text-[10px] font-bold px-2 py-0">
                          {s}
                        </Badge>
                      )) : <span className="text-[10px] text-slate-300 italic">No specific tags provided</span>}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-6 pt-0 bg-slate-50/50 border-t flex gap-3">
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-xl font-bold text-red-500 h-11"
                    onClick={() => handleReject(u)}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button 
                    className="flex-1 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white h-11 shadow-lg shadow-emerald-500/20"
                    onClick={() => handleVerify(u)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Verify
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
