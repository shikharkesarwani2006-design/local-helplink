
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  collection, 
  query, 
  orderBy, 
  where, 
  doc, 
} from "firebase/firestore";
import { 
  useFirestore, 
  useCollection, 
  useDoc,
  useMemoFirebase, 
  updateDocumentNonBlocking,
} from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Search, 
  Zap, 
  Trophy, 
  Star, 
  Heart, 
  TrendingUp, 
  MessageSquare, 
  Wrench, 
  BookOpen, 
  Droplets, 
  AlertTriangle,
  ChevronRight,
  Shield,
  Plus
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { User } from "firebase/auth";

export function VolunteerDashboardView({ profile, user }: { profile: any; user: User }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string | null>(null);

  // 1. My Active Help (Accepted by me)
  const activeHelpQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "requests"),
      where("acceptedBy", "==", user.uid),
      where("status", "==", "accepted"),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);
  const { data: activeMissions, isLoading: isActiveLoading } = useCollection(activeHelpQuery);

  // 2. Available Request Feed (Open missions)
  const availableQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
  }, [db]);
  const { data: availableMissions, isLoading: isAvailableLoading } = useCollection(availableQuery);

  const processedMissions = useMemo(() => {
    if (!availableMissions) return [];
    
    return availableMissions
      .map(req => {
        // Calculate match score based on volunteer skills
        const userSkills = profile?.skills || [];
        const isMatch = userSkills.some((s: string) => 
          req.title.toLowerCase().includes(s.toLowerCase()) || 
          req.description.toLowerCase().includes(s.toLowerCase()) ||
          req.category.toLowerCase().includes(s.toLowerCase())
        );
        return { ...req, isMatch };
      })
      .filter(req => {
        const isNotMine = req.createdBy !== user?.uid;
        const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSkill = !skillFilter || req.isMatch;
        return isNotMine && matchesSearch && matchesSkill;
      })
      .sort((a, b) => {
        // Sort: Match First, then Urgency High First, then Date
        if (a.isMatch !== b.isMatch) return a.isMatch ? -1 : 1;
        if (a.urgency !== b.urgency) return a.urgency === 'high' ? -1 : 1;
        return 0;
      });
  }, [availableMissions, profile?.skills, searchQuery, skillFilter, user?.uid]);

  const handleCompleteMission = (requestId: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "requests", requestId), { status: "completed" });
    toast({ title: "Mission Completed!", description: "Thank you for your impact!" });
  };

  const handleAcceptMission = (request: any) => {
    if (!db || !user) return;
    updateDocumentNonBlocking(doc(db, "requests", request.id), {
      status: "accepted",
      acceptedBy: user.uid,
    });
    toast({ title: "Mission Accepted!", description: "Contact the requester to coordinate." });
  };

  const getRank = (helped: number) => {
    if (helped >= 50) return { label: "Gold", color: "text-amber-500", icon: Trophy };
    if (helped >= 10) return { label: "Silver", color: "text-slate-400", icon: Shield };
    return { label: "Bronze", color: "text-orange-600", icon: Heart };
  };

  const rank = getRank(profile?.totalHelped || 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* 🚀 Header */}
      <section className="bg-slate-900 pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
        <div className="container mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary-foreground border border-primary/30 text-xs font-bold uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5" /> Verified Volunteer Control
            </div>
            <h1 className="text-3xl md:text-5xl font-headline font-bold text-white tracking-tight">
              Impact Hub: {profile?.name}
            </h1>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {profile?.skills?.map((skill: string) => (
                <Badge key={skill} className="bg-white/10 text-white border-white/20 hover:bg-white/20 transition-colors">
                  {skill}
                </Badge>
              ))}
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary-foreground hover:bg-white/10 uppercase font-black">
                  Manage Skills <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 flex items-center gap-6 shadow-2xl">
            <div className={cn("p-4 rounded-2xl bg-white/10", rank.color)}>
              <rank.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Volunteer Rank</p>
              <h3 className={cn("text-2xl font-black", rank.color)}>{rank.label} Tier</h3>
              <p className="text-xs text-white/60">{profile?.totalHelped || 0} Missions Completed</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container px-4 sm:px-6 mx-auto -mt-12 relative z-20 space-y-12">
        {/* 📊 Volunteer Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Total Helped", value: profile?.totalHelped || 0, icon: Heart, color: "bg-emerald-100 text-emerald-600" },
            { label: "This Week", value: "3", icon: TrendingUp, color: "bg-blue-100 text-blue-600" },
            { label: "Avg Response", value: "12m", icon: Clock, color: "bg-purple-100 text-purple-600" },
            { label: "Rating", value: profile?.rating?.toFixed(1) || "5.0", icon: Star, color: "bg-amber-100 text-amber-600" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-xl bg-white rounded-3xl group">
              <CardContent className="pt-6 pb-6 flex items-center gap-4 px-6">
                <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 🛠 Active Help Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-headline font-bold flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Missions In Progress
          </h2>
          
          {isActiveLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
            </div>
          ) : activeMissions?.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-500 font-medium">You aren't currently helping anyone. Check the feed below!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeMissions?.map((req) => (
                <Card key={req.id} className="rounded-3xl border-none shadow-xl bg-white overflow-hidden flex flex-col group border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center mb-2">
                      <Badge className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">Active Help</Badge>
                      <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Ongoing</span>
                    </div>
                    <CardTitle className="text-lg font-headline font-bold leading-tight">{req.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                             <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.createdBy}`} />
                             <AvatarFallback>?</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                             <span className="text-xs font-bold">{req.postedByName}</span>
                             <span className="text-[10px] text-slate-400">{req.location?.area}</span>
                          </div>
                       </div>
                       <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
                          <MessageSquare className="w-4 h-4" />
                       </Button>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-slate-50 flex gap-2">
                    <Button variant="default" className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold" onClick={() => handleCompleteMission(req.id)}>
                      Mark as Completed
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 🌎 Neighborhood Mission Feed */}
        <section className="space-y-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-3">
                <Search className="w-6 h-6 text-primary" /> Available Missions
              </h2>
              <p className="text-xs text-slate-500 font-medium">Matching your skills & neighborhood area</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setSkillFilter(null)} 
                  className={cn("px-4 h-10 rounded-full font-bold text-xs border transition-all", !skillFilter ? "bg-slate-900 text-white" : "bg-white text-slate-500")}
                >
                  All Missions
                </button>
                <button 
                  onClick={() => setSkillFilter("matched")} 
                  className={cn("flex items-center gap-2 px-4 h-10 rounded-full font-bold text-xs border transition-all", skillFilter === "matched" ? "bg-primary text-white" : "bg-white text-slate-500")}
                >
                  <Star className="w-3.5 h-3.5" /> Skill Matches
                </button>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Filter title..." className="pl-11 h-10 bg-white rounded-full text-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
          </div>

          {isAvailableLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}
            </div>
          ) : processedMissions.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed">
              <h3 className="text-lg font-bold">No Missions Found</h3>
              <p className="text-slate-500 mt-1">Check back later or expand your skills!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {processedMissions.map((request) => (
                <Card 
                  key={request.id} 
                  className={cn(
                    "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white rounded-[2rem] border-none flex flex-col h-full",
                    request.isMatch && "ring-2 ring-primary/20"
                  )}
                >
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    request.urgency === 'high' ? 'bg-red-500' : 'bg-slate-200'
                  )} />

                  <CardHeader className="pb-2 pt-8 pl-8 pr-6">
                    <div className="flex justify-between items-start mb-4">
                      {request.isMatch ? (
                         <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
                            <Star className="w-3 h-3 fill-primary" /> Skill Match
                         </div>
                      ) : (
                         <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{request.category}</Badge>
                      )}
                      <Badge className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        request.urgency === 'high' ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"
                      )}>
                        {request.urgency} Urgency
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-headline font-bold leading-tight">{request.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4 pl-8 pr-6">
                    <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">
                      {request.description}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase border-t pt-4">
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{request.location?.area}</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{formatDistanceToNow(request.createdAt.toDate())} ago</div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 pb-8 pl-8 pr-6">
                    <Button 
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold h-12 transition-all group-hover:scale-[1.02]"
                      onClick={() => handleAcceptMission(request)}
                    >
                      Accept & Help <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
