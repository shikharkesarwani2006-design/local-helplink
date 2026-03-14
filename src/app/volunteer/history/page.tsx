"use client";

import { useState, useMemo } from "react";
import { query, collection, where, doc } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  History, 
  Star, 
  Award, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Filter, 
  TrendingUp, 
  MessageSquare,
  Loader2,
  Inbox
} from "lucide-react";
import { format, formatDistanceToNow, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";

function RequesterCell({ userId }: { userId: string }) {
  const db = useFirestore();
  // FIXED: Ensure userId exists before calling doc()
  const ref = useMemoFirebase(() => (db && userId ? doc(db, "users", userId) : null), [db, userId]);
  const { data: profile } = useDoc(ref);

  if (!userId) return <span className="text-xs text-slate-400">Unknown</span>;

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email}`} />
        <AvatarFallback className="text-[8px]">{profile?.name?.[0] || '?'}</AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium">{profile?.name || "Member"}</span>
    </div>
  );
}

export default function MissionHistoryPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const [categoryFilter, setCategoryFilter] = useState("all");

  // REMOVED orderBy
  const missionsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "requests"), where("acceptedBy", "==", user.uid));
  }, [db, user?.uid]);
  const { data: rawMissions, isLoading: isMissionsLoading } = useCollection(missionsQuery);

  // JS FILTER AND SORT
  const missions = useMemo(() => {
    if (!rawMissions) return [];
    return [...rawMissions]
      .filter(m => m.status === 'completed')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawMissions]);

  // REMOVED orderBy
  const ratingsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "ratings"), where("toUser", "==", user.uid));
  }, [db, user?.uid]);
  const { data: rawRatings } = useCollection(ratingsQuery);

  // JS SORT
  const ratings = useMemo(() => {
    if (!rawRatings) return [];
    return [...rawRatings].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawRatings]);

  const stats = useMemo(() => {
    if (!missions) return { total: 0, thisMonth: 0, bestCategory: "None", avgRating: 0 };

    const now = new Date();
    const thisMonthMissions = missions.filter(m => {
      const date = m.completedAt?.toDate() || m.createdAt?.toDate() || now;
      return isSameMonth(date, now);
    });

    const categories: Record<string, number> = {};
    missions.forEach(m => {
      categories[m.category] = (categories[m.category] || 0) + 1;
    });
    const bestCat = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    const totalScore = ratings?.reduce((acc, r) => acc + r.score, 0) || 0;
    const avg = ratings && ratings.length > 0 ? totalScore / ratings.length : 5.0;

    return {
      total: missions.length,
      thisMonth: thisMonthMissions.length,
      bestCategory: bestCat,
      avgRating: avg
    };
  }, [missions, ratings]);

  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    ratings?.forEach(r => {
      if (r.score >= 1 && r.score <= 5) dist[5 - r.score]++;
    });
    return dist;
  }, [ratings]);

  const filteredHistory = useMemo(() => {
    if (!missions) return [];
    return missions.filter(m => categoryFilter === "all" || m.category === categoryFilter);
  }, [missions, categoryFilter]);

  if (isUserLoading || isMissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="bg-white border-b py-10 px-6">
        <div className="container max-w-6xl mx-auto space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
              <History className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-headline font-bold text-slate-900 tracking-tight">Mission History</h1>
          </div>
          <p className="text-slate-500 font-medium text-sm">Review your past contributions and community feedback.</p>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto py-12 px-6 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Total Missions", value: stats.total, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
            { label: "This Month", value: stats.thisMonth, icon: Calendar, color: "bg-blue-50 text-blue-600" },
            { label: "Best Category", value: stats.bestCategory, icon: Award, color: "bg-purple-50 text-purple-600", capitalize: true },
            { label: "Avg Rating", value: stats.avgRating.toFixed(1) + " ★", icon: Star, color: "bg-amber-50 text-amber-600" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm bg-white rounded-3xl group hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="pt-6 pb-6 flex items-center gap-4 px-6">
                <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                  <h3 className={cn("text-xl font-black text-slate-900", stat.capitalize && "capitalize")}>{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-8 border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 px-8 py-6">
              <div>
                <CardTitle className="text-xl font-headline font-bold">Service Ledger</CardTitle>
                <CardDescription>A complete log of missions you've fulfilled.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  className="text-xs font-bold bg-transparent outline-none cursor-pointer text-primary"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="blood">Blood</option>
                  <option value="tutor">Tutoring</option>
                  <option value="repair">Repair</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredHistory.length === 0 ? (
                <div className="py-20 text-center">
                  <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm font-medium">No missions found matching your criteria.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest h-12">Mission</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Category</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Requester</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Date</TableHead>
                      <TableHead className="pr-8 text-[10px] font-black uppercase tracking-widest h-12 text-right">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((m) => (
                      <TableRow key={m.id} className="border-slate-50 group hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-8 py-4">
                          <span className="font-bold text-slate-900 line-clamp-1">{m.title}</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="capitalize text-[10px] font-bold border-slate-200 bg-white">
                            {m.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <RequesterCell userId={m.createdBy} />
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-xs text-slate-500 font-medium">
                            {format(m.completedAt?.toDate() || m.createdAt?.toDate() || new Date(), 'MMM dd, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="pr-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-black">5.0</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Rating Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {[5, 4, 3, 2, 1].map((star, idx) => (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-4">{star}</span>
                    <Progress 
                      value={ratings?.length ? (ratingDistribution[idx] / ratings.length) * 100 : 0} 
                      className="h-2 bg-slate-100" 
                    />
                    <span className="text-xs font-bold text-slate-600 w-8">{ratingDistribution[idx]}</span>
                  </div>
                ))}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center pt-4">
                  Based on {ratings?.length || 0} community reviews
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" /> Impact Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="absolute left-8 top-0 bottom-8 w-px bg-slate-100" />
                <div className="space-y-8 relative">
                  {missions?.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex gap-4 items-start">
                      <div className="mt-1.5 w-4 h-4 rounded-full border-4 border-white bg-primary shadow-sm z-10" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                          {formatDistanceToNow(m.completedAt?.toDate() || m.createdAt?.toDate() || new Date())} ago
                        </p>
                        <p className="text-xs font-bold text-slate-800 line-clamp-2">
                          Helped with {m.title}
                        </p>
                      </div>
                    </div>
                  ))}
                  {missions.length === 0 && (
                    <div className="pl-10 py-4 text-xs text-slate-400 font-medium">
                      Complete your first mission to start your timeline!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="space-y-6">
          <h2 className="text-2xl font-headline font-bold text-slate-800 flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-amber-500" /> Recent Community Feedback
          </h2>
          {ratings.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed">
              <p className="text-slate-400 font-medium italic">No reviews yet. Help a neighbor to earn feedback!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ratings.map((r) => (
                <Card key={r.id} className="border-none shadow-sm bg-white rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={cn("w-3.5 h-3.5", s <= r.score ? "text-amber-400 fill-amber-400" : "text-slate-100")} />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {r.createdAt ? format(r.createdAt.toDate(), 'MMM dd') : 'Recent'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                    "{r.comment || "Great job, thank you for the help!"}"
                  </p>
                  <div className="pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                        N
                      </div>
                      <span className="text-xs font-bold text-slate-400 tracking-tight">Verified Neighbor</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
