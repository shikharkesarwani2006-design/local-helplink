"use client";

import { useMemo } from "react";
import { query, collection, where, orderBy, doc } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Star, 
  ShieldCheck, 
  Clock, 
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
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { RatingModal } from "@/components/profile/RatingModal";

export default function ProfilePage() {
  const { user } = useUser();
  const db = useFirestore();

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  const ratingsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "ratings"),
      where("toUser", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);
  const { data: ratings } = useCollection(ratingsQuery);

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

  const ratingStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    if (!ratings) return counts.map((c, i) => ({ stars: i + 1, count: c }));
    ratings.forEach(r => {
      const score = Math.round(r.score);
      if (score >= 1 && score <= 5) counts[score - 1]++;
    });
    return counts.map((c, i) => ({ stars: i + 1, count: c })).reverse();
  }, [ratings]);

  const chartConfig = {
    count: { label: "Ratings", color: "hsl(var(--primary))" },
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="bg-white border-b pt-12 pb-24 relative overflow-hidden">
        <div className="container max-w-6xl px-6 mx-auto flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email}`} />
              <AvatarFallback className="text-3xl font-headline bg-primary text-white">{profile?.name?.[0]}</AvatarFallback>
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
              <Badge className="bg-secondary/10 text-secondary border-none capitalize px-3 py-1">{profile?.role}</Badge>
            </div>
            <p className="text-slate-500 max-w-lg mx-auto md:mx-0">{profile?.bio || "Community member at Local HelpLink."}</p>
            <div className="flex items-center justify-center md:justify-start gap-4 text-sm font-semibold text-slate-400">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-slate-700">{profile?.rating?.toFixed(1) || "5.0"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-700">{profile?.totalHelped || 0} Helped</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3"><EditProfileModal profile={profile} /></div>
        </div>
      </div>

      <main className="container max-w-6xl px-6 mx-auto -mt-16 relative z-20">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <Card className="shadow-xl border-none bg-white">
              <CardHeader><CardTitle className="text-lg font-headline flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Impact</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase text-slate-400"><span>Progress</span><span>{Math.min(100, (profile?.totalHelped || 0) * 10)}%</span></div>
                  <Progress value={(profile?.totalHelped || 0) * 10} className="h-2" />
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-4">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <div><div className="text-sm font-bold text-amber-700">12 mins</div><div className="text-[10px] uppercase font-bold text-amber-500">Avg Response</div></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="bg-white p-1 mb-6 shadow-sm border rounded-2xl w-full grid grid-cols-3">
                <TabsTrigger value="history" className="font-bold gap-2"><History className="w-4 h-4" /> History</TabsTrigger>
                <TabsTrigger value="reviews" className="font-bold gap-2"><MessageSquare className="w-4 h-4" /> Reviews</TabsTrigger>
                <TabsTrigger value="activity" className="font-bold gap-2"><TrendingUp className="w-4 h-4" /> Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-headline font-bold">Posted</h3>
                  {myPosts?.map(req => (
                    <Card key={req.id} className="p-4 bg-white border-none shadow-sm"><p className="font-bold text-sm">{req.title}</p></Card>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="font-headline font-bold">Helped</h3>
                  {helpedHistory?.map(req => (
                    <Card key={req.id} className="p-4 bg-white border-none shadow-sm flex justify-between items-center">
                      <p className="font-bold text-sm">{req.title}</p>
                      <RatingModal requestId={req.id} toUser={req.createdBy} />
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="reviews" className="space-y-8">
                <Card className="bg-white border-none shadow-xl p-6">
                   <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <BarChart data={ratingStats} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="stars" type="category" tickFormatter={(val) => `${val} ★`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                   </ChartContainer>
                </Card>
                {ratings?.map(r => (
                  <Card key={r.id} className="p-6 bg-white border-none shadow-sm space-y-2">
                    <div className="flex gap-1">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= r.score ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}</div>
                    <p className="text-sm text-slate-600 italic">"{r.comment}"</p>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
