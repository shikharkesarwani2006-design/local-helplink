
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  doc, 
  runTransaction 
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Filter, 
  Zap, 
  Clock, 
  MapPin, 
  ChevronRight, 
  AlertTriangle,
  Loader2,
  Inbox,
  Star,
  ArrowUpDown
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { sendNotification } from "@/firebase/notifications";

export default function BrowseMissionsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "urgency" | "match">("skill");
  const [acceptingRequest, setAcceptingRequest] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. Fetch User Profile for Skills
  const profileRef = useMemoFirebase(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch Open Missions
  const missionsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
  }, [db]);
  const { data: missions, isLoading: isMissionsLoading } = useCollection(missionsQuery);

  // 3. Filtering & Sorting Logic
  const filteredMissions = useMemo(() => {
    if (!missions) return [];

    const userSkills = profile?.skills || [];

    return missions
      .map(m => {
        // Skill matching logic
        const isMatch = userSkills.some((skill: string) => 
          m.title?.toLowerCase().includes(skill.toLowerCase()) || 
          m.description?.toLowerCase().includes(skill.toLowerCase()) ||
          m.category?.toLowerCase().includes(skill.toLowerCase())
        );
        return { ...m, isMatch };
      })
      .filter(m => {
        const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
        const matchesUrgency = urgencyFilter === "all" || m.urgency === urgencyFilter;
        const matchesSearch = m.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             m.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const isNotMine = m.createdBy !== user?.uid;
        return matchesCategory && matchesUrgency && matchesSearch && isNotMine;
      })
      .sort((a, b) => {
        if (sortBy === "match") {
          if (a.isMatch !== b.isMatch) return a.isMatch ? -1 : 1;
        }
        if (sortBy === "urgency" || a.urgency === 'high' || b.urgency === 'high') {
          const urgencyMap: any = { high: 3, medium: 2, low: 1 };
          if (urgencyMap[a.urgency] !== urgencyMap[b.urgency]) {
            return urgencyMap[b.urgency] - urgencyMap[a.urgency];
          }
        }
        return b.createdAt?.toDate().getTime() - a.createdAt?.toDate().getTime();
      });
  }, [missions, categoryFilter, urgencyFilter, searchQuery, sortBy, user?.uid, profile?.skills]);

  const matchedCount = filteredMissions.filter(m => m.isMatch).length;

  const handleAcceptMission = async () => {
    if (!db || !user || !acceptingRequest || !profile) return;
    setLoading(true);
    try {
      const responseTime = Date.now() - acceptingRequest.createdAt.toDate().getTime();
      
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "requests", acceptingRequest.id);
        transaction.update(reqRef, {
          status: "accepted",
          acceptedBy: user.uid,
          responseTime: responseTime
        });
      });

      await sendNotification(db, acceptingRequest.createdBy, {
        title: "Mission Accepted! 🚀",
        message: `${profile.name} is coming to help with "${acceptingRequest.title}"!`,
        type: "accepted",
        link: "/requests/my"
      });

      setAcceptingRequest(null);
      router.push("/dashboard?tab=active");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading || isMissionsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* 🛠 Top Filter Bar */}
      <header className="bg-white border-b sticky top-16 z-30">
        <div className="container px-6 mx-auto py-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full lg:w-auto">
              <TabsList className="bg-slate-100 rounded-xl p-1 h-11 w-full lg:w-auto overflow-x-auto">
                <TabsTrigger value="all" className="rounded-lg font-bold px-4">All</TabsTrigger>
                <TabsTrigger value="blood" className="rounded-lg font-bold px-4">🩸 Blood</TabsTrigger>
                <TabsTrigger value="tutor" className="rounded-lg font-bold px-4">📚 Tutor</TabsTrigger>
                <TabsTrigger value="repair" className="rounded-lg font-bold px-4">🔧 Repair</TabsTrigger>
                <TabsTrigger value="emergency" className="rounded-lg font-bold px-4">🚨 Emergency</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-grow lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search missions..." 
                  className="pl-10 h-11 bg-slate-50 border-none rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
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
                <option value="match">Skill Match</option>
                <option value="newest">Newest First</option>
                <option value="urgency">Urgency First</option>
              </select>
            </div>
          </div>

          {/* ⚡ Skill Match Banner */}
          {profile?.skills?.length > 0 && (
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Showing {matchedCount} missions matching your skills
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Skills: {profile.skills.join(", ")}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/5" onClick={() => router.push('/profile')}>
                Update Skills
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* 🌎 Mission Feed */}
      <main className="container px-6 mx-auto py-8">
        {filteredMissions.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed space-y-4 max-w-2xl mx-auto">
            <Inbox className="w-16 h-16 text-slate-200 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">No open missions found</h3>
              <p className="text-slate-500">Try adjusting your filters or checking back later. We'll notify you when new requests arrive.</p>
            </div>
            <Button variant="outline" className="rounded-full font-bold" onClick={() => {
              setCategoryFilter("all");
              setUrgencyFilter("all");
              setSearchQuery("");
            }}>
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMissions.map((m) => (
              <Card 
                key={m.id} 
                className={cn(
                  "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white rounded-[2rem] border-none flex flex-col h-full",
                  m.urgency === 'high' ? "animate-pulse-red ring-2 ring-red-500/20" : ""
                )}
              >
                {/* Urgency indicator bar */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1.5",
                  m.urgency === 'high' ? "bg-red-500" : m.urgency === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                )} />

                <CardHeader className="pb-2 pt-8 pl-8 pr-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-slate-50 border-none">
                        {m.category === 'blood' ? '🩸' : m.category === 'tutor' ? '📚' : m.category === 'repair' ? '🔧' : '🚨'} {m.category}
                      </Badge>
                      {m.isMatch && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
                          <Zap className="w-3 h-3 fill-primary" /> Skill Match
                        </div>
                      )}
                    </div>
                    <Badge className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      m.urgency === 'high' ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {m.urgency} Urgency
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-headline font-bold leading-tight group-hover:text-primary transition-colors">
                    {m.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-grow space-y-4 pl-8 pr-6">
                  <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">
                    {m.description}
                  </p>
                  
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.createdBy}`} />
                        <AvatarFallback className="bg-slate-100 text-xs font-bold">{m.postedByName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Posted By</span>
                        <span className="text-xs font-bold text-slate-700">{m.postedByName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{m.location?.area || "Campus"}</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{formatDistanceToNow(m.createdAt.toDate())} ago</div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-4 pb-8 pl-8 pr-6">
                  <Button 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold h-12 transition-all active:scale-95 group-hover:scale-[1.02]"
                    onClick={() => setAcceptingRequest(m)}
                  >
                    Accept Mission <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 🚀 Accept Confirmation Modal */}
      <Dialog open={!!acceptingRequest} onOpenChange={(open) => !open && setAcceptingRequest(null)}>
        <DialogContent className="rounded-3xl p-8">
          <DialogHeader>
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold">Accept this Mission?</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              You are committing to help with <strong>"{acceptingRequest?.title}"</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requester Info</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm"><AvatarFallback>{acceptingRequest?.postedByName?.[0]}</AvatarFallback></Avatar>
                <div>
                  <p className="text-sm font-bold text-slate-900">{acceptingRequest?.postedByName}</p>
                  <p className="text-xs text-slate-500">Coordinate via {acceptingRequest?.contactPreference || 'in-app'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
               <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
               <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                 Safety first: Only coordinate in public campus areas and let a friend know before you meet someone new.
               </p>
            </div>
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" className="flex-1 rounded-xl font-bold h-12" onClick={() => setAcceptingRequest(null)}>Not Now</Button>
            <Button className="flex-[2] rounded-xl bg-primary text-white font-bold h-12 shadow-lg shadow-primary/20" onClick={handleAcceptMission} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm & Help
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
