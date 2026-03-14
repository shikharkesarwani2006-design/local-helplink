
"use client";

import { useMemo } from "react";
import { query, collection, where, doc } from "firebase/firestore";
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
  Award,
  MapPin,
  Mail,
  Phone,
  PlusCircle,
  Zap,
  TrendingUp,
  Activity,
  Calendar,
  Heart,
  Timer,
  BarChart3
} from "lucide-react";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { RatingModal } from "@/components/profile/RatingModal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  // 1. Fetch User Profile
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  // 2. Fetch Received Ratings (Reviews of me)
  const ratingsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "ratings"),
      where("toUser", "==", user.uid)
    );
  }, [db, user?.uid]);
  const { data: rawReviews } = useCollection(ratingsQuery);
  const reviews = useMemo(() => {
    if (!rawReviews) return [];
    return [...rawReviews].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawReviews]);

  // 3. Fetch History of helping others
  const helpedHistoryQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "requests"),
      where("acceptedBy", "==", user.uid)
    );
  }, [db, user?.uid]);
  const { data: rawHelpedHistory } = useCollection(helpedHistoryQuery);
  
  const helpedHistory = useMemo(() => {
    if (!rawHelpedHistory) return [];
    return [...rawHelpedHistory]
      .filter(req => req.status === 'completed')
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawHelpedHistory]);

  // 4. Fetch My Posts history
  const myPostsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "requests"),
      where("createdBy", "==", user.uid)
    );
  }, [db, user?.uid]);
  const { data: rawMyPosts } = useCollection(myPostsQuery);
  
  const myPosts = useMemo(() => {
    if (!rawMyPosts) return [];
    return [...rawMyPosts].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [rawMyPosts]);

  // ANALYTICS COMPUTATION
  const analytics = useMemo(() => {
    if (!profile || !myPosts || !helpedHistory) return null;

    // A. My Requests Analytics
    const totalPosted = myPosts.length;
    const fulfilled = myPosts.filter(r => r.status === 'completed').length;
    const fulfillmentRate = totalPosted > 0 ? Math.round((fulfilled / totalPosted) * 100) : 0;
    
    const responseTimes = myPosts
      .map(r => r.responseTime)
      .filter(t => t !== undefined && t !== null);
    const avgResponseReceived = responseTimes.length > 0 
      ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) / 60000)
      : 0;

    const postCategories = myPosts.reduce((acc: any, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {});
    const bestPostingCategory = Object.entries(postCategories).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "None";

    const memberDays = profile.createdAt ? differenceInDays(new Date(), profile.createdAt.toDate()) : 0;

    // B. Volunteer/Provider Analytics
    const hoursContributed = helpedHistory.reduce((acc, r) => acc + (r.duration || 0), 0);
    const helpingCategories = helpedHistory.reduce((acc: any, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {});
    const topSkillUsed = Object.entries(helpingCategories).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "None";

    return {
      totalPosted,
      fulfillmentRate,
      avgResponseReceived,
      bestPostingCategory,
      memberDays,
      hoursContributed,
      topSkillUsed,
      totalHelped: helpedHistory.length,
      rating: profile.rating || 5.0
    };
  }, [profile, myPosts, helpedHistory]);

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="container max-w-6xl px-6 mx-auto py-20 space-y-8">
        <div className="flex items-center gap-8">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20">
      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 pt-12 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="container max-w-6xl px-6 mx-auto flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-white dark:border-slate-800 shadow-2xl ring-4 ring-primary/5">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email}`} />
              <AvatarFallback className="text-3xl font-headline bg-primary text-white font-bold">
                {profile?.name?.[0]}
              </AvatarFallback>
            </Avatar>
            {profile?.verified && (
              <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white dark:border-slate-800 shadow-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="flex-grow text-center md:text-left space-y-4">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-4xl font-headline font-bold text-slate-900 dark:text-white">{profile?.name}</h1>
              <Badge className="bg-primary/10 text-primary border-none capitalize px-3 py-1 font-bold">
                {profile?.role}
              </Badge>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {profile?.email}</div>
              {profile?.phone && <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {profile?.phone}</div>}
              {profile?.location?.area && <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {profile.location.area}</div>}
              {profile?.createdAt && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> 
                  Joined {profile.createdAt ? format(profile.createdAt.toDate(), 'MMM yyyy') : 'Recently'}
                </div>
              )}
            </div>

            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto md:mx-0 leading-relaxed">
              {profile?.bio || "No bio added yet. Help your neighbors get to know you!"}
            </p>
          </div>
          
          <div className="flex gap-3">
            <EditProfileModal profile={profile} />
          </div>
        </div>
      </div>

      <main className="container max-w-6xl px-6 mx-auto -mt-16 relative z-20">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar Stats & Impact */}
          <div className="lg:col-span-4 space-y-8">
            {/* MY IMPACT CARD */}
            <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> My Request Impact
                </CardTitle>
                <CardDescription>Stats from needs you've broadcasted</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 flex flex-col items-center text-center">
                    <PlusCircle className="w-5 h-5 text-indigo-500 mb-2" />
                    <span className="text-xl font-black text-slate-900 dark:text-white">{analytics?.totalPosted || 0}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Total Posted</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 flex flex-col items-center text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
                    <span className="text-xl font-black text-slate-900 dark:text-white">{analytics?.fulfillmentRate || 0}%</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Fulfilled</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 flex flex-col items-center text-center">
                    <Timer className="w-5 h-5 text-amber-500 mb-2" />
                    <span className="text-xl font-black text-slate-900 dark:text-white">{analytics?.avgResponseReceived || 0}m</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Avg Response</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 flex flex-col items-center text-center">
                    <Calendar className="w-5 h-5 text-blue-500 mb-2" />
                    <span className="text-xl font-black text-slate-900 dark:text-white">{analytics?.memberDays || 0}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Days Active</span>
                  </div>
                </div>
                <div className="pt-2 px-1">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
                    <span>Most used category</span>
                    <span className="text-primary font-bold">{analytics?.bestPostingCategory}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VOLUNTEER/PROVIDER IMPACT */}
            {(profile?.role === 'volunteer' || profile?.role === 'provider') && (
              <Card className="shadow-xl border-none bg-slate-900 text-white rounded-[2rem] overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Trophy className="w-24 h-24" />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500 fill-rose-500" /> Neighborhood Service
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center text-center">
                      <Users className="w-5 h-5 text-indigo-400 mb-2" />
                      <span className="text-xl font-black text-white">{analytics?.totalHelped || 0}</span>
                      <span className="text-[9px] uppercase font-bold opacity-50">People Helped</span>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center text-center">
                      <Clock className="w-5 h-5 text-emerald-400 mb-2" />
                      <span className="text-xl font-black text-white">{analytics?.hoursContributed || 0}</span>
                      <span className="text-[9px] uppercase font-bold opacity-50">Hours Given</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-xs font-bold opacity-60">Top Expertise</span>
                      <Badge className="bg-primary/20 text-primary-foreground border-none capitalize">{analytics?.topSkillUsed}</Badge>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-xs font-bold opacity-60">Avg Rating</span>
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <Star className="w-4 h-4 fill-current" />
                        {analytics?.rating.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {profile?.skills && profile.skills.length > 0 && (
              <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-[2.5rem]">
                <CardHeader>
                  <CardTitle className="text-xl font-headline font-bold">Verified Skills</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {profile.skills.map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 font-bold">
                      {skill}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Tabs Section */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="bg-white dark:bg-slate-900 p-1.5 mb-8 shadow-sm border dark:border-slate-800 rounded-2xl w-full grid grid-cols-3 h-14">
                <TabsTrigger value="posts" className="font-bold gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                  <PlusCircle className="w-4 h-4" /> My Posts
                </TabsTrigger>
                <TabsTrigger value="helped" className="font-bold gap-2 rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                  <History className="w-4 h-4" /> Helped others
                </TabsTrigger>
                <TabsTrigger value="reviews" className="font-bold gap-2 rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  <MessageSquare className="w-4 h-4" /> Reviews
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                {myPosts.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 font-medium">You haven't posted any help requests yet.</p>
                  </div>
                ) : (
                  myPosts.map(req => (
                    <Card key={req.id} className="p-6 bg-white dark:bg-slate-900 border-none shadow-sm rounded-2xl flex items-center justify-between group hover:shadow-md transition-shadow">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={cn(
                            "text-[9px] uppercase font-black px-2",
                            req.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {req.status}
                          </Badge>
                          <span className="text-[10px] font-bold text-slate-400">
                            {req.createdAt ? formatDistanceToNow(req.createdAt.toDate()) : "Recently"} ago
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{req.title}</h4>
                      </div>
                      {req.status === 'completed' && req.acceptedBy && (
                        <RatingModal requestId={req.id} toUser={req.acceptedBy} />
                      )}
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="helped" className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                {helpedHistory.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 font-medium">You haven't helped anyone yet. Check the feed to get started!</p>
                  </div>
                ) : (
                  helpedHistory.map(req => (
                    <Card key={req.id} className="p-6 bg-white dark:bg-slate-900 border-none shadow-sm rounded-2xl flex items-center justify-between group hover:shadow-md transition-shadow">
                      <div className="space-y-1">
                        <Badge className="bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase mb-1">Impact Made</Badge>
                        <h4 className="font-bold text-slate-900 dark:text-white">{req.title}</h4>
                        <p className="text-[10px] font-bold text-slate-400">
                          Completed on {req.completedAt ? req.completedAt.toDate().toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-100 p-2 rounded-full">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="reviews" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                {reviews.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 font-medium">No reviews yet. Complete missions to earn community feedback!</p>
                  </div>
                ) : (
                  reviews.map(r => (
                    <Card key={r.id} className="p-6 bg-white dark:bg-slate-900 border-none shadow-sm rounded-2xl space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => (
                            <Star 
                              key={s} 
                              className={`w-4 h-4 ${s <= r.score ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-800'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {r.createdAt ? formatDistanceToNow(r.createdAt.toDate()) : "Recently"} ago
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 italic leading-relaxed font-medium">
                        "{r.comment || "Great job, thank you for the help!"}"
                      </p>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
