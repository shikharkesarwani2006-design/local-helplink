
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MyRequests() {
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "requests"),
      where("createdBy", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-700";
      case "accepted": return "bg-amber-100 text-amber-700";
      case "completed": return "bg-emerald-100 text-emerald-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      <header className="bg-white border-b py-8">
        <div className="container px-6 mx-auto">
          <h1 className="text-3xl font-headline font-bold text-secondary">My Request History</h1>
          <p className="text-slate-500">Tracking your impact and open calls for help</p>
        </div>
      </header>

      <main className="container px-6 mx-auto mt-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>
        ) : myRequests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-secondary/30">
            <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">You haven't posted any help requests yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myRequests.map((req) => (
              <Card key={req.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-headline">{req.title}</CardTitle>
                    <div className="text-xs text-slate-400">
                      Posted {req.timestamp ? formatDistanceToNow(req.timestamp.toDate()) : "just now"} ago
                    </div>
                  </div>
                  <Badge className={`capitalize ${getStatusColor(req.status)}`}>
                    {req.status}
                  </Badge>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-sm text-slate-600 line-clamp-2">{req.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
