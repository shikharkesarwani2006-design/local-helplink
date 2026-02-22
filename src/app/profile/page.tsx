
"use client";

import { useState, useMemo } from "react";
import { query, collection, where, orderBy, doc, Timestamp } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Star, 
  Trophy, 
  ShieldCheck, 
  Clock, 
  Heart, 
  Settings2, 
  Plus, 
  CheckCircle2, 
  MessageSquare,
  History,
  TrendingUp,
  Award
} from "lucide-react";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { RatingModal } from "@/components/profile/RatingModal";

export default function ProfilePage() {
  const { user } = useUser();
  const db = useFirestore();

  // 1. Fetch User Profile
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  // 2. Fetch Received Ratings
  const ratingsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "ratings"),
      where("toUser", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);
  const { data: ratings } = useCollection(ratingsQuery);

  // 3. Fetch Help History
  const historyQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "requests"),
      where("acceptedBy", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);
  const { data: helpedHistory } = useCollection(historyQuery);

  const myPostsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "requests"),
      where("createdBy", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);
  const { data: myPosts } = useCollection(myPostsQuery);

  // Calculate Rating Distribution for Chart
  const ratingStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // for 1-5 stars
    if (!ratings) return counts.map((c, i) => ({ stars: i + 1, count: c }));
    ratings.forEach(r => {
      const score = Math.round(r.score);
      if (score >= 1 && score <= 5) counts[score - 1]++;
    });
    return counts.map((c, i) => ({ stars: i + 1, count: c })).reverse();
  }, [ratings]);

  const chartConfig = {
    count: {
      label: "Ratings",
      color: "hsl(var(--primary))",
    },
  };

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      {/* PROFILE HEADER SECTION */}
      <div className="bg-white border-b pt-12 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full -ml-48 -mb-48 blur-3xl" />
        
        <div className="container max-w-6xl px-6 mx-auto flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email}`} />
              <AvatarFallback className="text-3xl font-headline bg-primary text-white">
                {profile?.name?.[0]}
              </AvatarFallback>
            </Avatar>
            {profile?.verified && (
              <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="flex-grow text-center md:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-4xl font-headline font-bold text-secondary">{profile?.name}</h1>
              <Badge className="bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/10 capitalize px-3 py-1 text-sm">
                {profile?.role || 'Member'}
              </Badge>
            </div>
            <p className="text-slate-500 max-w-lg mx-auto md:mx-0">
              {profile?.bio || "Building a stronger, safer community one help request at a time. Let's grow together."}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4 text-sm font-semibold text-slate-400">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-slate-700">{profile?.rating?.toFixed(1) || "5.0"}</span>
                <span>({ratings?.length || 0} reviews)</span>
              </div>
              <span className="text-slate-200">|</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-700">{profile?.totalHelped || 0} People Helped</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <EditProfileModal profile={profile} />
          </div>
        </div>
      </div>

      <main className="container max-w-6xl px-6 mx-auto -mt-16 relative z-20">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* LEFT SIDEBAR: Stats & Skills */}
          <div className="lg:col-span-4 space-y-8">
            <Card className="shadow-xl border-none">
              <CardHeader>
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" /> Impact Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase text-slate-400 tracking-wider">
                    <span>Weekly Goal</span>
                    <span>{Math.min(100, (profile?.totalHelped || 0) * 10)}%</span>
                  </div>
                  <Progress value={(profile?.totalHelped || 0) * 10} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                    <div className="text-2xl font-bold text-secondary">{myPosts?.length || 0}</div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Posted</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                    <div className="text-2xl font-bold text-primary">{helpedHistory?.length || 0}</div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Fulfilled</div>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-4">
                  <div className="bg-white p-2 rounded-xl shadow-sm">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-700">{profile?.avgResponseTime || "12"} mins</div>
                    <div className="text-[10px] uppercase font-bold text-amber-500">Avg Response</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-none">
              <CardHeader>
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary" /> Verified Skills
                </CardTitle>
                <CardDescription>Skills you can offer to others</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {profile?.skills?.map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="bg-secondary/5 text-secondary border-secondary/20 px-3 py-1">
                      {skill}
                    </Badge>
                  ))}
                  {(!profile?.skills || profile.skills.length === 0) && (
                    <p className="text-sm text-slate-400 italic">No skills added yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MAIN CONTENT: Tabs for Reviews & History */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="bg-white p-1 h-auto mb-6 shadow-sm border rounded-2xl w-full grid grid-cols-3 md:w-auto">
                <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-secondary data-[state=active]:text-white h-10 gap-2 font-bold">
                  <History className="w-4 h-4" /> History
                </TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-xl data-[state=active]:bg-secondary data-[state=active]:text-white h-10 gap-2 font-bold">
                  <MessageSquare className="w-4 h-4" /> Reviews
                </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-xl data-[state=active]:bg-secondary data-[state=active]:text-white h-10 gap-2 font-bold">
                  <TrendingUp className="w-4 h-4" /> Activity
                </TabsTrigger>
              </TabsList>

              {/* HISTORY TAB */}
              <TabsContent value="history" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h3 className="font-headline font-bold text-lg px-2">Requests Posted</h3>
                    {myPosts?.map(req => (
                      <Card key={req.id} className="shadow-sm border-none hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div className="space-y-1">
                            <p className="font-bold text-sm line-clamp-1">{req.title}</p>
                            <p className="text-[10px] text-slate-400">{req.createdAt ? formatDistanceToNow(req.createdAt.toDate()) : "just now"} ago</p>
                          </div>
                          <Badge className={`text-[10px] ${req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {req.status}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                    {myPosts?.length === 0 && <p className="text-center text-slate-400 text-sm py-8 border rounded-2xl border-dashed">No posts yet.</p>}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-headline font-bold text-lg px-2">Helped With</h3>
                    {helpedHistory?.map(req => (
                      <Card key={req.id} className="shadow-sm border-none hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div className="space-y-1">
                            <p className="font-bold text-sm line-clamp-1">{req.title}</p>
                            <p className="text-[10px] text-slate-400">Accepted {req.createdAt ? formatDistanceToNow(req.createdAt.toDate()) : "just now"} ago</p>
                          </div>
                          <RatingModal requestId={req.id} toUser={req.createdBy} />
                        </CardContent>
                      </Card>
                    ))}
                    {helpedHistory?.length === 0 && <p className="text-center text-slate-400 text-sm py-8 border rounded-2xl border-dashed">No help history yet.</p>}
                  </div>
                </div>
              </TabsContent>

              {/* REVIEWS TAB */}
              <TabsContent value="reviews" className="space-y-8">
                <Card className="shadow-xl border-none">
                  <CardHeader>
                    <CardTitle className="font-headline">Rating Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <BarChart data={ratingStats} layout="vertical" margin={{ left: -20 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="stars" 
                          type="category" 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(val) => `${val} ★`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="count" 
                          fill="hsl(var(--primary))" 
                          radius={[0, 4, 4, 0]} 
                          barSize={20}
                        />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h3 className="font-headline font-bold text-xl px-2">Community Feedback</h3>
                  {ratings?.map(rating => (
                    <Card key={rating.id} className="shadow-sm border-none">
                      <CardContent className="p-6 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-3 h-3 ${s <= rating.score ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                              {rating.createdAt ? formatDistanceToNow(rating.createdAt.toDate()) : "just now"} ago
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 italic">"{rating.comment || "No comment left."}"</p>
                      </CardContent>
                    </Card>
                  ))}
                  {ratings?.length === 0 && <p className="text-center py-12 text-slate-400 italic">No reviews yet.</p>}
                </div>
              </TabsContent>

              <TabsContent value="activity">
                <div className="grid md:grid-cols-2 gap-6">
                   <Card className="border-none shadow-xl bg-primary/5">
                      <CardHeader>
                        <CardTitle className="text-lg font-headline">Weekly Engagement</CardTitle>
                      </CardHeader>
                      <CardContent className="h-48 flex items-center justify-center">
                        <TrendingUp className="w-12 h-12 text-primary opacity-20" />
                        <p className="text-slate-400 text-sm italic ml-4">Detailed activity graphs coming soon.</p>
                      </CardContent>
                   </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
