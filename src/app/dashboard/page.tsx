"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  where, 
  doc, 
  Timestamp, 
  writeBatch, 
  getDocs,
  limit
} from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Search, 
  ArrowRight, 
  Users, 
  Flame, 
  Droplets,
  BookOpen,
  Wrench,
  AlertCircle,
  AlertTriangle,
  Zap,
  Phone,
  MessageSquare,
  ChevronRight,
  Heart,
  Filter
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { sendNotification } from "@/firebase/notifications";

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Auto-expire cleanup logic
  useEffect(() => {
    if (!db || !user) return;
    const cleanupExpiredRequests = async () => {
      const now = Timestamp.now();
      const q = query(
        collection(db, "requests"),
        where("status", "==", "open"),
        where("expiresAt", "<", now),
        limit(20)
      );
      try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => {
          batch.update(d.ref, { status: "expired" });
          sendNotification(db, d.data().createdBy, {
            title: "Request Expired",
            message: `Your request "${d.data().title}" has expired.`,
            type: "system",
            link: "/requests/my"
          });
        });
        await batch.commit();
      } catch (err) { console.error("Cleanup error:", err); }
    };
    cleanupExpiredRequests();
  }, [db, user]);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "requests"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
  }, [db, user]);

  const { data: allRequests, isLoading } = useCollection(requestsQuery);

  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests
      .filter(req => {
        const matchesSearch = 
          req.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          req.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || req.category === categoryFilter;
        return matchesSearch && matchesCategory;
      });
  }, [allRequests, searchQuery, categoryFilter]);

  const handleAcceptRequest = async (request: any) => {
    if (!user || !db) return;
    const requestRef = doc(db, "requests", request.id);
    const now = Timestamp.now();
    const createdDate = request.createdAt instanceof Timestamp ? request.createdAt.toDate() : new Date();
    const responseTimeMinutes = Math.max(0, Math.floor((now.toMillis() - createdDate.getTime()) / 60000));

    updateDocumentNonBlocking(requestRef, {
      status: "accepted",
      acceptedBy: user.uid,
      responseTime: responseTimeMinutes,
    });

    sendNotification(db, request.createdBy, {
      title: "Mission Accepted!",
      message: `${user.displayName || "A neighbor"} has accepted your request.`,
      type: "accepted",
      link: `/requests/my`
    });

    toast({
      title: "Help Accepted!",
      description: "You've successfully claimed this request.",
    });
    setSelectedRequest(null);
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case "critical": return "border-red-500 bg-red-50 text-red-600";
      case "medium": return "border-amber-500 bg-amber-50 text-amber-600";
      default: return "border-emerald-500 bg-emerald-50 text-emerald-600";
    }
  };

  const categories = [
    { id: "all", label: "All", icon: Filter },
    { id: "blood", label: "Blood", icon: Droplets },
    { id: "tutor", label: "Tutor", icon: BookOpen },
    { id: "repair", label: "Repair", icon: Wrench },
    { id: "emergency", label: "Emergency", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Navbar />

      <main className="container px-6 mx-auto py-8 space-y-8">
        {/* STATS STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-2xl">
                <Flame className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Open Requests</p>
                <h3 className="text-2xl font-bold text-slate-900">{allRequests?.length || 0}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="bg-emerald-100 p-3 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">People Helped</p>
                <h3 className="text-2xl font-bold text-slate-900">1,248</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-2xl">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Volunteers</p>
                <h3 className="text-2xl font-bold text-slate-900">84 Active</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={categoryFilter === cat.id ? "default" : "outline"}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  "rounded-full px-5 font-bold h-10 border-slate-200",
                  categoryFilter === cat.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white text-slate-600"
                )}
              >
                <cat.icon className="w-4 h-4 mr-2" />
                {cat.label}
              </Button>
            ))}
          </div>
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search missions..." 
              className="pl-11 h-11 bg-white border-slate-200 rounded-full focus:ring-primary/20 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* FEED GRID */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-3xl" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-24 text-center">
            <div className="bg-white p-8 rounded-full inline-block mb-6 shadow-sm">
              <Zap className="w-12 h-12 text-slate-200" />
            </div>
            <h3 className="text-2xl font-headline font-bold text-slate-700">All Quiet in the Neighborhood</h3>
            <p className="text-slate-500 mt-2">Be the first to help your community by posting a request.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRequests.map((request) => (
              <Card 
                key={request.id} 
                className={cn(
                  "group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white rounded-3xl border border-slate-100 flex flex-col h-full cursor-pointer",
                  request.urgency === 'critical' && "animate-pulse-red"
                )}
                onClick={() => setSelectedRequest(request)}
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <Badge className={cn("capitalize px-3 py-1 font-bold text-[10px] rounded-full border-2", getUrgencyStyles(request.urgency))}>
                      {request.urgency}
                    </Badge>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {request.createdAt ? formatDistanceToNow(request.createdAt.toDate()) : "just now"}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-headline font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">
                    {request.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">
                    {request.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span>{request.location?.area || "Campus Area"}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 pb-6 bg-slate-50/50 flex justify-between items-center mt-auto border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 ring-2 ring-white">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.createdBy}`} />
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-bold text-slate-700">{request.postedByName || "Member"}</span>
                  </div>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-full font-bold h-8 px-4">
                    Accept <ChevronRight className="ml-1 w-3 h-3" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* REQUEST DETAIL DIALOG */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          {selectedRequest && (
            <div className="flex flex-col">
              <div className={cn("p-8 text-white", selectedRequest.urgency === 'critical' ? 'bg-red-500' : 'bg-primary')}>
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-white/20 border-white/30 text-white font-bold uppercase text-[10px]">
                    {selectedRequest.category}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-headline font-bold mb-2">
                  {selectedRequest.title}
                </DialogTitle>
                <p className="text-white/80 text-sm font-medium">
                  Posted {formatDistanceToNow(selectedRequest.createdAt.toDate())} ago • {selectedRequest.location?.area}
                </p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Description</h4>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedRequest.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Contact Method</p>
                    <p className="text-sm font-bold text-slate-700 capitalize">{selectedRequest.contactPreference || "In-App"}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Expires In</p>
                    <p className="text-sm font-bold text-slate-700">
                      {selectedRequest.expiresAt ? formatDistanceToNow(selectedRequest.expiresAt.toDate()) : '...'}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
                <Button variant="ghost" className="font-bold text-slate-500 flex-1" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
                  onClick={() => handleAcceptRequest(selectedRequest)}
                >
                  Accept Mission
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}