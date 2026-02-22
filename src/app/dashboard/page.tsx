
"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, AlertTriangle, CheckCircle2, Navigation2, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRadius, setFilterRadius] = useState(5); // km
  const { toast } = useToast();

  useEffect(() => {
    // Real-time listener for requests
    const q = query(collection(db, "requests"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((req: any) => {
        // Simple expiry filter: only show open requests that aren't expired
        const now = new Date();
        const expiresAt = req.expiresAt?.toDate();
        return req.status === "open" && (!expiresAt || expiresAt > now);
      });
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAcceptRequest = async (requestId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: "accepted",
        acceptedBy: user.uid,
      });
      toast({
        title: "Request Accepted!",
        description: "You have committed to helping with this request.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      
      <header className="bg-white border-b py-8">
        <div className="container px-6 mx-auto flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-secondary">Nearby Help Requests</h1>
            <p className="text-slate-500">Showing requests within {filterRadius}km of your campus</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" /> Filter
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Navigation2 className="w-4 h-4" /> Update Location
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto mt-8">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-secondary/30">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-headline font-bold text-slate-700">No active requests nearby</h2>
            <p className="text-slate-500">Everything seems quiet! Check back later or post a request yourself.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <Card key={request.id} className="group hover:shadow-xl transition-all border-l-4 border-l-primary flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className={`capitalize ${getUrgencyColor(request.urgency)}`}>
                      {request.urgency}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{request.category}</span>
                  </div>
                  <CardTitle className="text-xl font-headline group-hover:text-secondary transition-colors line-clamp-2">
                    {request.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-slate-600 text-sm line-clamp-3 mb-4">{request.description}</p>
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{request.location?.area || "Near Campus Center"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Posted {request.timestamp ? formatDistanceToNow(request.timestamp.toDate()) : "just now"} ago</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-6 border-t mt-4 flex justify-between items-center bg-slate-50/50">
                  <div className="pt-4 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.createdBy}`} />
                    </Avatar>
                    <span className="text-[10px] font-medium text-slate-400">Request ID: {request.id.slice(0, 6)}</span>
                  </div>
                  <div className="pt-4">
                    <Button 
                      size="sm" 
                      className="bg-accent hover:bg-accent/90 text-white"
                      onClick={() => handleAcceptRequest(request.id)}
                    >
                      Help Out
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
