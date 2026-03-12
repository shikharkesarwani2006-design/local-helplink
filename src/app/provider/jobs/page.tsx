"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  doc, 
  runTransaction,
  serverTimestamp
} from "firebase/firestore";
import { 
  useFirestore, 
  useUser, 
  useDoc, 
  useCollection, 
  useMemoFirebase 
} from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Zap, 
  Clock, 
  MapPin, 
  ChevronRight, 
  AlertTriangle,
  Loader2,
  Inbox,
  Phone,
  MessageSquare,
  Smartphone,
  Filter,
  CheckCircle2,
  CircleDollarSign,
  Star
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { sendNotification } from "@/firebase/notifications";
import { useToast } from "@/hooks/use-toast";

export default function ProviderAvailableJobsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [myCategoryOnly, setMyCategoryOnly] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "urgency">("newest");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. Fetch Provider Profile
  const profileRef = useMemoFirebase(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch Open Requests
  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
  }, [db]);
  const { data: allOpenRequests, isLoading: isRequestsLoading } = useCollection(requestsQuery);

  // 3. Filtering & Sorting
  const filteredJobs = useMemo(() => {
    if (!allOpenRequests) return [];

    return allOpenRequests
      .filter(job => {
        const matchesCategory = !myCategoryOnly || (profile?.serviceCategory && job.category.toLowerCase() === profile.serviceCategory.toLowerCase());
        const matchesUrgency = urgencyFilter === "all" || job.urgency === urgencyFilter;
        const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             job.description.toLowerCase().includes(searchQuery.toLowerCase());
        const isNotMine = job.createdBy !== user?.uid;
        return matchesCategory && matchesUrgency && matchesSearch && isNotMine;
      })
      .sort((a, b) => {
        if (sortBy === "urgency") {
          const urgencyMap: any = { high: 3, medium: 2, low: 1 };
          return urgencyMap[b.urgency] - urgencyMap[a.urgency];
        }
        return b.createdAt?.toDate().getTime() - a.createdAt?.toDate().getTime();
      });
  }, [allOpenRequests, myCategoryOnly, urgencyFilter, searchQuery, sortBy, profile?.serviceCategory, user?.uid]);

  const handleAcceptJob = async (job: any) => {
    if (!db || !user || !profile) return;
    if (!profile.verified) {
      toast({
        variant: "destructive",
        title: "Verification Required",
        description: "Your account must be verified by an admin to accept jobs."
      });
      return;
    }

    setLoading(true);
    try {
      const responseTime = Date.now() - job.createdAt.toDate().getTime();
      
      await runTransaction(db, async (transaction) => {
        const jobRef = doc(db, "requests", job.id);
        transaction.update(jobRef, {
          status: "accepted",
          acceptedBy: user.uid,
          acceptedAt: serverTimestamp(),
          responseTime: responseTime
        });
      });

      await sendNotification(db, job.createdBy, {
        title: "Expert Assigned! 🔧",
        message: `${profile.name} has accepted your ${job.category} request.`,
        type: "accepted",
        link: "/requests/my"
      });

      toast({
        title: "Job Accepted! 🎉",
        description: "Coordinate with the requester to begin work.",
      });

      setSelectedJob(null);
      router.push("/dashboard?tab=active");
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Acceptance Failed",
        description: e.message || "Could not accept job right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading || isRequestsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* 🛠 Filter Bar */}
      <header className="bg-white border-b sticky top-16 z-30 shadow-sm">
        <div className="container px-6 mx-auto py-6 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
            <div className="space-y-1">
              <h1 className="text-3xl font-headline font-bold text-slate-900 tracking-tight">Available Jobs</h1>
              <p className="text-slate-500 text-sm font-medium">Browse community service inquiries matching your expertise.</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <Switch 
                  id="category-toggle" 
                  checked={myCategoryOnly} 
                  onCheckedChange={setMyCategoryOnly}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="category-toggle" className="text-xs font-bold text-slate-600 cursor-pointer">
                  My Category Only
                </Label>
              </div>

              <div className="relative flex-grow lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search jobs..." 
                  className="pl-10 h-11 bg-slate-50 border-none rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  className="h-11 bg-slate-50 border-none rounded-xl px-4 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                >
                  <option value="all">Any Urgency</option>
                  <option value="high">Critical Only</option>
                  <option value="medium">Medium</option>
                  <option value="low">Normal</option>
                </select>
                <select 
                  className="h-11 bg-slate-50 border-none rounded-xl px-4 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="newest">Newest First</option>
                  <option value="urgency">Urgency First</option>
                </select>
              </div>
            </div>
          </div>

          {!profile?.verified && (
            <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <p className="text-xs font-bold text-amber-700">
                You are currently in browsing mode. Complete admin verification to start accepting jobs.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* 📋 Job Feed */}
      <main className="container px-6 mx-auto py-10">
        {filteredJobs.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed space-y-6 max-w-2xl mx-auto shadow-sm">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <Inbox className="w-10 h-10 text-slate-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900">No matching jobs found</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Try expanding your category search or wait for new community alerts.</p>
            </div>
            <div className="pt-4 flex justify-center gap-4">
               <Badge variant="outline" className="bg-slate-50 text-slate-400 border-none h-8 px-4 font-bold">
                 Total Open: {allOpenRequests?.length || 0}
               </Badge>
               <Button variant="ghost" className="text-primary font-bold" onClick={() => {
                 setMyCategoryOnly(false);
                 setUrgencyFilter("all");
                 setSearchQuery("");
               }}>
                 Show All Requests
               </Button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredJobs.map((job) => (
              <Card 
                key={job.id} 
                className={cn(
                  "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white rounded-[2rem] border-none flex flex-col h-full",
                  job.urgency === 'high' ? "animate-pulse-red ring-2 ring-red-500/20" : ""
                )}
              >
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1.5",
                  job.urgency === 'high' ? "bg-red-500" : job.urgency === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                )} />

                <CardHeader className="pb-2 pt-8 pl-8 pr-6">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-slate-50 border-none px-3 py-1">
                      {job.category}
                    </Badge>
                    <Badge className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      job.urgency === 'high' ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {job.urgency}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-headline font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {job.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-grow space-y-4 pl-8 pr-6">
                  <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>
                  
                  <div className="pt-4 border-t space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${job.createdBy}`} />
                          <AvatarFallback className="bg-slate-100 text-[10px] font-bold">{job.postedByName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-slate-700">{job.postedByName}</span>
                      </div>
                      {profile?.hourlyRate && (
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          <CircleDollarSign className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black">₹{profile.hourlyRate}/hr</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{job.location?.area || "Campus"}</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{formatDistanceToNow(job.createdAt.toDate())} ago</div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-4 pb-8 pl-8 pr-6">
                  <Button 
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold h-12 shadow-lg shadow-emerald-500/20 transition-all group-hover:scale-[1.02]"
                    onClick={() => setSelectedJob(job)}
                  >
                    Accept Job <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 🚀 Job Detail Modal */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="rounded-[2.5rem] p-8 sm:max-w-[600px] overflow-hidden">
          <DialogHeader>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <Badge className={cn(
                "capitalize px-4 py-1.5 font-black text-[10px] rounded-full border-2",
                selectedJob?.urgency === 'high' ? "border-red-500/50 bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"
              )}>
                {selectedJob?.urgency} Urgency
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-headline font-bold text-slate-900 leading-tight">
              {selectedJob?.title}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-base pt-2">
              {selectedJob?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                <p className="text-sm font-bold capitalize flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {selectedJob?.category}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact Preference</p>
                <p className="text-sm font-bold capitalize flex items-center gap-2">
                  {selectedJob?.contactPreference === 'whatsapp' ? <Smartphone className="w-4 h-4 text-emerald-500" /> : 
                   selectedJob?.contactPreference === 'call' ? <Phone className="w-4 h-4 text-blue-500" /> : 
                   <MessageSquare className="w-4 h-4 text-primary" />}
                  {selectedJob?.contactPreference || 'In-App Chat'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Requester Identity</h4>
              <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 ring-4 ring-slate-50">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedJob?.createdBy}`} />
                    <AvatarFallback>{selectedJob?.postedByName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-bold text-slate-900">{selectedJob?.postedByName}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-slate-500">4.9 Neighborhood Rating</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase">Location</p>
                   <p className="text-xs font-bold text-slate-700">{selectedJob?.location?.area}</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
               <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
               <div className="space-y-1">
                 <p className="text-[11px] font-bold text-amber-800">Professional Safety Guideline</p>
                 <p className="text-[10px] text-amber-700/80 leading-relaxed">
                   Verify requirements and estimated time with the requester before starting work. For paid services, confirm the final rate via in-app coordination.
                 </p>
               </div>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0 pt-2">
            <Button variant="ghost" className="flex-1 rounded-2xl font-bold h-14 text-slate-500" onClick={() => setSelectedJob(null)}>
              Skip This Job
            </Button>
            <Button 
              className="flex-[2] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-14 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all" 
              onClick={() => handleAcceptJob(selectedJob)}
              disabled={loading || !profile?.verified}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
              {profile?.verified ? "Confirm & Accept Job" : "Pending Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
