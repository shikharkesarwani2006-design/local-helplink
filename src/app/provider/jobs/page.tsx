"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  query, 
  where, 
  doc, 
  serverTimestamp
} from "firebase/firestore";
import { 
  useFirestore, 
  useUser, 
  useDoc, 
  useCollection, 
  useMemoFirebase,
  updateDocumentNonBlocking
} from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Star,
  ExternalLink,
  PartyPopper
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
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [acceptedJobData, setAcceptedJobData] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);

  // 1. Fetch Provider Profile
  const profileRef = useMemoFirebase(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch Open Requests
  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open")
    );
  }, [db]);
  const { data: rawOpenRequests, isLoading: isRequestsLoading } = useCollection(requestsQuery);

  // 3. Filtering & Sorting
  const filteredJobs = useMemo(() => {
    if (!rawOpenRequests) return [];

    return [...rawOpenRequests]
      .filter(job => {
        const jobCategory = job.category || "";
        const matchesCategory = !myCategoryOnly || (profile?.serviceCategory && jobCategory.toLowerCase() === profile.serviceCategory.toLowerCase());
        const matchesUrgency = urgencyFilter === "all" || job.urgency === urgencyFilter;
        const title = job.title || "";
        const description = job.description || "";
        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             description.toLowerCase().includes(searchQuery.toLowerCase());
        const isNotMine = job.createdBy !== user?.uid;
        return matchesCategory && matchesUrgency && matchesSearch && isNotMine;
      })
      .sort((a, b) => {
        if (sortBy === "urgency") {
          const urgencyMap: any = { high: 3, medium: 2, low: 1 };
          if (urgencyMap[b.urgency] !== urgencyMap[a.urgency]) {
            return urgencyMap[b.urgency] - urgencyMap[a.urgency];
          }
        }
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      });
  }, [rawOpenRequests, myCategoryOnly, urgencyFilter, searchQuery, sortBy, profile?.serviceCategory, user?.uid]);

  const handleAcceptJob = async () => {
    if (!db || !user || !profile || !selectedJob || !selectedJob.createdBy) return;

    // VERIFICATION CHECK
    if (!profile.verified) {
      toast({
        variant: "destructive",
        title: "Verification Required",
        description: "Your account needs admin verification before accepting jobs",
      });
      return;
    }

    if (profile.isAvailable === false) {
      toast({
        variant: "destructive",
        title: "Currently Busy",
        description: "Change your status to 'Available' in the sidebar to accept jobs."
      });
      return;
    }

    setLoading(true);
    try {
      const requestRef = doc(db, "requests", selectedJob.id);
      const responseTime = Date.now() - (selectedJob.createdAt?.toMillis() || Date.now());
      
      // 1. Update Request status (using the specific update fields requested)
      updateDocumentNonBlocking(requestRef, {
        status: "accepted",
        acceptedBy: user.uid,
        acceptedAt: serverTimestamp(),
        responseTime: responseTime
      });

      // 2. Set provider as busy
      const userRef = doc(db, "users", user.uid);
      updateDocumentNonBlocking(userRef, {
        isAvailable: false
      });

      // 3. Write notification to requester
      // Guard against missing createdBy
      if (selectedJob.createdBy) {
        await sendNotification(db, selectedJob.createdBy, {
          title: "Expert Assigned! 🔧",
          message: `${profile.name} has accepted your request.`,
          type: "accepted",
          link: "/requests/my"
        });
      }

      setAcceptedJobData(selectedJob);
      setSelectedJob(null);
      setConfirmChecked(false);
      
      toast({
        title: "Job Accepted! 🎉",
        description: "Coordinate with your neighbor to start work.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to accept mission.",
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
                You are currently in browsing mode. Your account needs admin verification before accepting jobs.
              </p>
            </div>
          )}
        </div>
      </header>

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
                 Total Open: {rawOpenRequests?.length || 0}
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
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" />{job.createdAt ? formatDistanceToNow(job.createdAt.toDate()) : "just now"} ago</div>
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

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && (setSelectedJob(null), setConfirmChecked(false))}>
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
              Confirm & Accept Job
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-base pt-2">
              Review details and confirm your commitment to help.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="p-5 bg-slate-50 rounded-3xl space-y-3 border border-slate-100">
              <h4 className="text-lg font-bold text-slate-900 leading-tight">{selectedJob?.title}</h4>
              <p className="text-sm text-slate-500 line-clamp-3">{selectedJob?.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Requester</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{selectedJob?.postedByName}</span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-[10px] font-black">4.9</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Your Rate</p>
                <p className="text-sm font-bold text-emerald-600">
                  {profile?.hourlyRate ? `₹${profile.hourlyRate}/hr` : 'Volunteer Service'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="bg-primary/20 p-2 rounded-xl"><MessageSquare className="w-4 h-4 text-primary" /></div>
                 <div className="space-y-0.5">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preference</p>
                   <p className="text-xs font-bold text-slate-700 capitalize">{selectedJob?.contactPreference || "In-App Chat"}</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="bg-emerald-100 p-2 rounded-xl"><MapPin className="w-4 h-4 text-emerald-600" /></div>
                 <div className="space-y-0.5">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</p>
                   <p className="text-xs font-bold text-slate-700">{selectedJob?.location?.area}</p>
                 </div>
               </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <Checkbox 
                id="confirm-accept" 
                checked={confirmChecked} 
                onCheckedChange={(val) => setConfirmChecked(!!val)}
                className="mt-1"
              />
              <Label htmlFor="confirm-accept" className="text-xs font-bold text-amber-800 leading-relaxed cursor-pointer">
                I confirm I can complete this job and will coordinate professionally with the neighbor.
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0 pt-2">
            <Button variant="ghost" className="flex-1 rounded-2xl font-bold h-14 text-slate-500" onClick={() => setSelectedJob(null)}>
              Cancel
            </Button>
            <Button 
              className="flex-[2] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-14 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all" 
              onClick={handleAcceptJob}
              disabled={loading || !confirmChecked}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
              Confirm & Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!acceptedJobData} onOpenChange={(open) => !open && setAcceptedJobData(null)}>
        <DialogContent className="rounded-[3rem] p-10 sm:max-w-[500px] text-center">
          <DialogHeader>
            <div className="bg-emerald-100 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
              <PartyPopper className="w-12 h-12 text-emerald-600" />
            </div>
            <DialogTitle className="text-3xl font-headline font-bold text-slate-900 mb-2">Job Accepted! 🎉</DialogTitle>
            <DialogDescription className="text-slate-500 mb-8 font-medium">You are now the expert assigned to this mission.</DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 rounded-[2rem] p-6 text-left border space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${acceptedJobData?.createdBy}`} />
                  <AvatarFallback>{acceptedJobData?.postedByName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requester</p>
                  <p className="text-base font-bold text-slate-900">{acceptedJobData?.postedByName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 text-primary border-slate-200" asChild>
                  <a href={`tel:${acceptedJobData?.phone || '0000000000'}`}><Phone className="w-4 h-4" /></a>
                </Button>
                {acceptedJobData?.contactPreference === 'whatsapp' && (
                  <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 text-emerald-500 border-slate-200" asChild>
                    <a href={`https://wa.me/${acceptedJobData?.phone || '0000000000'}`} target="_blank"><Smartphone className="w-4 h-4" /></a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
               <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                 <MapPin className="w-4 h-4 text-primary" />
                 <span>Location: <span className="font-bold text-slate-900">{acceptedJobData?.location?.area}</span></span>
               </div>
               <Button variant="secondary" className="w-full rounded-xl font-bold h-11 bg-white border shadow-sm gap-2" asChild>
                 <a href={`https://www.google.com/maps/search/?api=1&query=${acceptedJobData?.location?.area}`} target="_blank">
                   <ExternalLink className="w-4 h-4" /> Get Directions
                 </a>
               </Button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button className="h-14 rounded-2xl bg-slate-900 text-white font-bold text-lg" onClick={() => router.push('/dashboard?tab=active')}>
              Go to Active Jobs
            </Button>
            <Button variant="ghost" className="font-bold text-slate-400" onClick={() => setAcceptedJobData(null)}>
              Dismiss
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
