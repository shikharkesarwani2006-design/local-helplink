"use client";

import { useState, useMemo } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  where, 
  doc,
  increment,
  runTransaction
} from "firebase/firestore";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  updateDocumentNonBlocking 
} from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Star, 
  ShieldCheck, 
  Settings, 
  MapPin, 
  CircleDollarSign,
  AlertCircle,
  ChevronRight,
  User,
  History,
  Loader2,
  FileUp,
  Ban,
  Zap
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { User as FirebaseUser } from "firebase/auth";
import { sendNotification } from "@/firebase/notifications";

export function ProviderDashboardView({ profile, user }: { profile: any; user: FirebaseUser }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Stats Calculations
  const totalEarnings = (profile?.totalHelped || 0) * (profile?.hourlyRate || 50);

  // 1. ACTIVE JOBS: Accepted but not completed
  const activeJobsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "requests"),
      where("acceptedBy", "==", user.uid),
      where("status", "==", "accepted"),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);
  const { data: activeJobs, isLoading: isActiveLoading } = useCollection(activeJobsQuery);

  // 2. INCOMING REQUESTS: Open and matching category
  const incomingQuery = useMemoFirebase(() => {
    if (!db || !profile?.serviceCategory) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      where("category", "==", profile.serviceCategory.toLowerCase()),
      orderBy("createdAt", "desc")
    );
  }, [db, profile?.serviceCategory]);
  const { data: incomingRequests, isLoading: isIncomingLoading } = useCollection(incomingQuery);

  // 3. JOB HISTORY: Completed by me
  const historyQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "requests"),
      where("acceptedBy", "==", user.uid),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);
  const { data: jobHistory, isLoading: isHistoryLoading } = useCollection(historyQuery);

  const handleToggleAvailability = (checked: boolean) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "users", user.uid), { isAvailable: checked });
    toast({
      title: checked ? "Status: Available" : "Status: Busy",
      description: checked ? "You will now see new incoming jobs." : "New jobs are hidden while you are busy.",
    });
  };

  const handleAcceptJob = async (request: any) => {
    if (!db || !user) return;
    setLoading(true);
    try {
      const responseTime = Date.now() - request.createdAt.toDate().getTime();
      
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", request.id);
        transaction.update(reqRef, {
          status: "accepted",
          acceptedBy: user.uid,
          responseTime: responseTime
        });
      });

      // Notify Requester
      await sendNotification(db, request.createdBy, {
        title: "Professional Provider Assigned! 🔧",
        message: `${profile.name} (Service Provider) has accepted your request!`,
        type: "accepted",
        link: "/requests/my"
      });

      toast({ title: "Job Accepted", description: "Coordinate with the client immediately." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to accept job." });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteJob = async (request: any) => {
    if (!db || !user) return;
    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", request.id);
        const providerRef = doc(db, "users", user.uid);
        transaction.update(reqRef, { status: "completed" });
        transaction.update(providerRef, { totalHelped: increment(1) });
      });

      // Notify Requester
      await sendNotification(db, request.createdBy, {
        title: "Service Completed! 🎉",
        message: `${profile.name} marked the service as complete. Please leave a rating!`,
        type: "completed",
        link: "/profile"
      });

      toast({ title: "Job Completed!", description: "Your earnings and rank have been updated." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to complete job." });
    } finally {
      setLoading(false);
    }
  };

  const updateProviderSetting = (field: string, value: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "users", user.uid), { [field]: value });
    toast({ title: "Settings Updated" });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* 🚀 Provider Header */}
      <section className="bg-slate-900 pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30" />
        <div className="container mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white/10 ring-4 ring-primary/20">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                  <AvatarFallback className="bg-primary text-white text-2xl font-bold">{profile?.name?.[0]}</AvatarFallback>
                </Avatar>
                {profile?.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-slate-900">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-headline font-bold text-white tracking-tight">{profile?.name}</h1>
                  <Badge className="bg-primary/20 text-primary-foreground border-primary/30 uppercase text-[10px] font-black">
                    {profile?.serviceCategory || "Provider"}
                  </Badge>
                </div>
                <p className="text-white/60 text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Serving: {profile?.location?.area || "All Campus"}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-white">{profile?.rating?.toFixed(1) || "5.0"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-white">{profile?.totalHelped || 0} Jobs</span>
                  </div>
                </div>
              </div>
            </div>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-[2rem] w-full lg:w-auto overflow-hidden">
              <CardContent className="p-6 flex flex-col md:flex-row items-center gap-8">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    profile?.isAvailable ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-red-500"
                  )} />
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Status</p>
                    <p className="text-sm font-bold text-white">{profile?.isAvailable ? "Accepting Jobs" : "Currently Busy"}</p>
                  </div>
                  <Switch 
                    checked={profile?.isAvailable || false} 
                    onCheckedChange={handleToggleAvailability}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                <div className="h-10 w-px bg-white/10 hidden md:block" />
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Simulated Revenue</p>
                  <p className="text-2xl font-black text-emerald-400">₹{totalEarnings}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <main className="container px-4 sm:px-6 mx-auto -mt-12 relative z-20 space-y-8">
        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-xl border w-full lg:w-fit grid grid-cols-3 h-14">
            <TabsTrigger value="incoming" className="rounded-xl font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Zap className="w-4 h-4" /> New Inquiries
              {incomingRequests && incomingRequests.length > 0 && profile?.isAvailable && (
                <span className="bg-red-500 text-white text-[10px] h-4 w-4 rounded-full flex items-center justify-center animate-bounce">
                  {incomingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-xl font-bold gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Briefcase className="w-4 h-4" /> Active Jobs
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl font-bold gap-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white">
              <Settings className="w-4 h-4" /> Service Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-6 mt-8">
            {!profile?.isAvailable ? (
              <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed space-y-4">
                <Ban className="w-16 h-16 text-slate-200 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">Queue Paused</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">Toggle your availability to "Available" to start receiving new service inquiries from the community.</p>
                </div>
                <Button variant="outline" className="rounded-full font-bold" onClick={() => handleToggleAvailability(true)}>Go Online Now</Button>
              </div>
            ) : isIncomingLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}
              </div>
            ) : incomingRequests?.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed space-y-2">
                <AlertCircle className="w-12 h-12 text-slate-200 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">No new inquiries in {profile?.serviceCategory}</h3>
                <p className="text-slate-500">New requests will appear here as soon as they are posted.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {incomingRequests?.map((req) => (
                  <Card key={req.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl bg-white rounded-[2rem] border-none flex flex-col h-full border-t-4 border-t-primary">
                    <CardHeader className="pb-2 pt-8 pl-8 pr-6">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{req.category}</Badge>
                        <Badge className={cn(
                          "text-[9px] font-black uppercase",
                          req.urgency === 'high' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>{req.urgency}</Badge>
                      </div>
                      <CardTitle className="text-lg font-headline font-bold leading-tight">{req.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow pl-8 pr-6">
                      <p className="text-slate-500 text-xs line-clamp-3 mb-4">{req.description}</p>
                      <div className="space-y-2 pt-4 border-t">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-primary" /> {req.location?.area}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <Clock className="w-3.5 h-3.5" /> Posted {formatDistanceToNow(req.createdAt.toDate())} ago
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-4 pb-8 pl-8 pr-6">
                      <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold h-12 transition-all active:scale-95" onClick={() => handleAcceptJob(req)} disabled={loading}>
                        Accept Job <ChevronRight className="ml-2 w-4 h-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-6 mt-8">
            {isActiveLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}
              </div>
            ) : activeJobs?.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed space-y-2">
                <Briefcase className="w-12 h-12 text-slate-200 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">No Active Service Jobs</h3>
                <p className="text-slate-500">Accepted jobs will appear here for management.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeJobs?.map((req) => (
                  <Card key={req.id} className="rounded-3xl border-none shadow-xl bg-white overflow-hidden flex flex-col border-l-4 border-l-amber-500">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-center mb-2">
                        <Badge className="bg-amber-50 text-amber-700 text-[10px] font-black uppercase">Job in Progress</Badge>
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Accepted Recently
                        </span>
                      </div>
                      <CardTitle className="text-lg font-headline font-bold leading-tight">{req.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10"><AvatarFallback>{req.postedByName?.[0]}</AvatarFallback></Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{req.postedByName}</span>
                            <span className="text-[10px] text-slate-400">{req.location?.area}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                             <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Preference: {req.contactPreference || "In-App"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-4 border-t border-slate-50 p-6 flex gap-2">
                      <Button variant="outline" className="flex-1 rounded-xl font-bold text-xs">Message</Button>
                      <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs" onClick={() => handleCompleteJob(req)} disabled={loading}>
                        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                        Complete
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-8">
            <div className="grid lg:grid-cols-12 gap-8">
              <Card className="lg:col-span-8 bg-white border-none shadow-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="border-b bg-slate-50/50 p-8">
                  <CardTitle className="text-2xl font-headline font-bold">Service Profile Settings</CardTitle>
                  <CardDescription>Adjust your service parameters to attract better matches.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold">Business Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          defaultValue={profile?.name} 
                          className="pl-10 h-12 rounded-xl"
                          onBlur={(e) => updateProviderSetting("name", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Hourly Rate (₹)</Label>
                      <div className="relative">
                        <CircleDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="number" 
                          defaultValue={profile?.hourlyRate || 50} 
                          className="pl-10 h-12 rounded-xl"
                          onBlur={(e) => updateProviderSetting("hourlyRate", Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold">Service Area Radius (km)</Label>
                      <Input 
                        type="number" 
                        defaultValue={profile?.serviceRadius || 5} 
                        className="h-12 rounded-xl"
                        onBlur={(e) => updateProviderSetting("serviceRadius", Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Availability Hours</Label>
                      <Input 
                        defaultValue={profile?.availabilityHours} 
                        placeholder="e.g. 9AM - 6PM"
                        className="h-12 rounded-xl"
                        onBlur={(e) => updateProviderSetting("availabilityHours", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Verification Documents</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                      <FileUp className="w-12 h-12 text-slate-300 mx-auto mb-4 group-hover:text-primary transition-colors" />
                      <p className="text-sm font-bold text-slate-600">Click to upload certification</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, JPG or PNG (Max 5MB)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card className="bg-white border-none shadow-xl rounded-[2.5rem]">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Service Category</CardTitle>
                    <CardDescription>Only inquiries from this category will show.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {["Repair", "Tutoring", "Delivery", "Medical", "Cleaning"].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => updateProviderSetting("serviceCategory", cat)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm",
                          profile?.serviceCategory?.toLowerCase() === cat.toLowerCase() 
                            ? "border-primary bg-primary/5 text-primary" 
                            : "border-slate-50 hover:border-slate-100"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-emerald-50 border-none shadow-xl rounded-[2.5rem] p-6 border border-emerald-100">
                  <div className="space-y-4">
                    <div className="bg-emerald-500 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-emerald-900">Verified Professional</h3>
                      <p className="text-xs text-emerald-700/80 leading-relaxed">Verification increases client trust by 80%. Upload your documents to get the green shield badge.</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}