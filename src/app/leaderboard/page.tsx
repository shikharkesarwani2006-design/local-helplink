
"use client";

import { useState, useMemo } from "react";
import { query, collection, where, doc } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  Medal, 
  Award, 
  Star, 
  Users, 
  Zap, 
  CheckCircle2, 
  Droplets, 
  BookOpen, 
  Wrench,
  Loader2,
  TrendingUp,
  Target
} from "lucide-react";
import { 
  startOfWeek, 
  startOfMonth, 
  isAfter, 
  format 
} from "date-fns";
import { cn } from "@/lib/utils";

export default function LeaderboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [timeframe, setTimeframe] = useState("all-time");

  // 1. Fetch Users for All-Time and Profile Info
  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"));
  }, [db]);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection(usersQuery);

  // 2. Fetch Completed Requests for Periodic Rankings
  const completedMissionsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "requests"), where("status", "==", "completed"));
  }, [db]);
  const { data: completedRequests, isLoading: isRequestsLoading } = useCollection(completedMissionsQuery);

  const leaderboardData = useMemo(() => {
    if (!allUsers || !completedRequests) return [];

    let filteredMissions = [...completedRequests];
    const now = new Date();

    if (timeframe === "week") {
      const weekStart = startOfWeek(now);
      filteredMissions = filteredMissions.filter(m => m.completedAt && isAfter(m.completedAt.toDate(), weekStart));
    } else if (timeframe === "month") {
      const monthStart = startOfMonth(now);
      filteredMissions = filteredMissions.filter(m => m.completedAt && isAfter(m.completedAt.toDate(), monthStart));
    }

    // Aggregate counts for periodic timeframe
    const helperCounts: Record<string, number> = {};
    filteredMissions.forEach(m => {
      if (m.acceptedBy) {
        helperCounts[m.acceptedBy] = (helperCounts[m.acceptedBy] || 0) + 1;
      }
    });

    // Map counts to user profiles
    const mapped = allUsers.map(u => {
      const helpedCount = timeframe === "all-time" ? (u.totalHelped || 0) : (helperCounts[u.id] || 0);
      return {
        ...u,
        helpedInPeriod: helpedCount
      };
    });

    return mapped
      .filter(u => u.helpedInPeriod > 0)
      .sort((a, b) => b.helpedInPeriod - a.helpedInPeriod || (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);
  }, [allUsers, completedRequests, timeframe]);

  const userRank = useMemo(() => {
    if (!user || leaderboardData.length === 0) return null;
    const index = leaderboardData.findIndex(u => u.id === user.uid);
    return index !== -1 ? index + 1 : null;
  }, [leaderboardData, user]);

  const impactStats = useMemo(() => {
    if (!completedRequests) return { total: 0, blood: 0, tutor: 0, repair: 0 };
    
    let filtered = [...completedRequests];
    const now = new Date();
    if (timeframe === "week") {
      const start = startOfWeek(now);
      filtered = filtered.filter(m => m.completedAt && isAfter(m.completedAt.toDate(), start));
    } else if (timeframe === "month") {
      const start = startOfMonth(now);
      filtered = filtered.filter(m => m.completedAt && isAfter(m.completedAt.toDate(), start));
    }

    return {
      total: filtered.length,
      blood: filtered.filter(m => m.category === "blood").length,
      tutor: filtered.filter(m => m.category === "tutor").length,
      repair: filtered.filter(m => m.category === "repair").length,
    };
  }, [completedRequests, timeframe]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <span className="text-2xl">🥇</span>;
      case 2: return <span className="text-2xl">🥈</span>;
      case 3: return <span className="text-2xl">🥉</span>;
      default: return <span className="font-black text-slate-300 w-6 text-center">{rank}th</span>;
    }
  };

  if (isUsersLoading || isRequestsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="bg-white border-b py-12 px-6">
        <div className="container max-w-5xl mx-auto space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl text-white shadow-xl shadow-primary/20 rotate-3">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-headline font-bold text-slate-900 tracking-tight">Community Heroes</h1>
              <p className="text-slate-500 font-medium">Celebrating those who make our neighborhood safer and stronger.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl px-6 mx-auto mt-10 space-y-8">
        {userRank && (
          <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-3 rounded-2xl text-white">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">You are #{userRank} on the leaderboard!</h3>
                <p className="text-sm text-slate-500">Keep helping neighbors to climb higher in the ranks.</p>
              </div>
            </div>
            <div className="hidden sm:block">
              <Badge className="bg-primary text-white font-bold h-10 px-6 rounded-full text-lg">
                Top {Math.ceil((userRank / leaderboardData.length) * 100)}%
              </Badge>
            </div>
          </div>
        )}

        <Tabs defaultValue="all-time" className="w-full" onValueChange={setTimeframe}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <TabsList className="bg-white p-1 rounded-2xl shadow-sm border h-14 w-full md:w-auto grid grid-cols-3">
              <TabsTrigger value="week" className="font-bold rounded-xl px-8">This Week</TabsTrigger>
              <TabsTrigger value="month" className="font-bold rounded-xl px-8">This Month</TabsTrigger>
              <TabsTrigger value="all-time" className="font-bold rounded-xl px-8">All Time</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-6 py-3 rounded-2xl border shadow-sm">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Live Rankings
            </div>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-20 pl-8 font-black text-[10px] uppercase tracking-widest h-14">Rank</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Neighbor</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Role</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase tracking-widest h-14">Missions</TableHead>
                  <TableHead className="text-right pr-8 font-black text-[10px] uppercase tracking-widest h-14">Reputation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center text-slate-400 font-medium">
                      No contributions tracked for this period yet.
                    </TableCell>
                  </TableRow>
                ) : leaderboardData.map((item, index) => {
                  const rank = index + 1;
                  const isCurrentUser = item.id === user?.uid;

                  return (
                    <TableRow 
                      key={item.id} 
                      className={cn(
                        "border-slate-50 transition-colors group",
                        isCurrentUser ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-slate-50/50"
                      )}
                    >
                      <TableCell className="pl-8 py-5">
                        {getRankIcon(rank)}
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.email}`} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{item.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className={cn(
                              "font-bold truncate",
                              isCurrentUser ? "text-primary" : "text-slate-900"
                            )}>
                              {item.name} {isCurrentUser && "(You)"}
                            </p>
                            <p className="text-xs text-slate-400 truncate font-medium">{item.location?.area || "Campus Member"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="outline" className={cn(
                          "capitalize font-bold text-[9px] border-none px-3",
                          item.role === 'provider' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {item.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-5">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 group-hover:bg-white transition-colors border">
                          <span className="text-lg font-black text-slate-900 leading-none">{item.helpedInPeriod}</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8 py-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-black text-slate-700">{item.rating?.toFixed(1) || "5.0"}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </Tabs>

        <section className="pt-12 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-headline font-bold text-slate-900">Collective Impact</h2>
            <p className="text-slate-500 font-medium">What we've achieved together {timeframe === 'all-time' ? 'lifetime' : timeframe === 'week' ? 'this week' : 'this month'}.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="rounded-3xl border-none shadow-sm bg-indigo-600 text-white p-8 space-y-4">
              <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-4xl font-black">{impactStats.total}</h4>
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">Requests Resolved</p>
              </div>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-white p-8 space-y-4 border-l-4 border-l-red-500">
              <div className="bg-red-50 w-12 h-12 rounded-2xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h4 className="text-4xl font-black text-slate-900">{impactStats.blood}</h4>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Blood Donations</p>
              </div>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-white p-8 space-y-4 border-l-4 border-l-blue-500">
              <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h4 className="text-4xl font-black text-slate-900">{impactStats.tutor}</h4>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tutor Sessions</p>
              </div>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-white p-8 space-y-4 border-l-4 border-l-amber-500">
              <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center">
                <Wrench className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h4 className="text-4xl font-black text-slate-900">{impactStats.repair}</h4>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Repairs Done</p>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
