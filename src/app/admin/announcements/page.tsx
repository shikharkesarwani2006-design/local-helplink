
"use client";

import { useState, useMemo } from "react";
import { collection, addDoc, serverTimestamp, query, doc, deleteDoc } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Trash2, Clock, Info, AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminAnnouncementsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    urgency: "info" as "info" | "warning" | "critical"
  });
  const [loading, setLoading] = useState(false);

  // REMOVED orderBy to avoid index
  const announcementsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "announcements"));
  }, [db]);
  const { data: rawAnnouncements, isLoading } = useCollection(announcementsQuery);

  // SORT IN JS
  const announcements = useMemo(() => {
    if (!rawAnnouncements) return [];
    return [...rawAnnouncements].sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });
  }, [rawAnnouncements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, "announcements"), {
        ...formData,
        active: true,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      
      toast({ title: "Announcement Published", description: "All community members will see this on their dashboards." });
      setFormData({ title: "", message: "", urgency: "info" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to publish", description: "Verify you have admin permissions." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "announcements", id));
      toast({ title: "Announcement Removed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="bg-white border-b py-8 px-6">
        <div className="container mx-auto space-y-1">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-primary" /> Community Broadcasts
          </h1>
          <p className="text-slate-500 text-sm">Post global announcements to all neighborhood dashboards.</p>
        </div>
      </header>

      <main className="container px-6 mx-auto py-8 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <Card className="rounded-[2rem] border-none shadow-xl sticky top-24">
            <CardHeader>
              <CardTitle className="text-xl font-headline font-bold">New Announcement</CardTitle>
              <CardDescription>This will appear as a banner for all users.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold">Headline</Label>
                  <Input 
                    placeholder="e.g. Campus Wi-Fi Maintenance"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Urgency Level</Label>
                  <Select value={formData.urgency} onValueChange={(v: any) => setFormData({ ...formData, urgency: v })}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">🔵 Information (Normal)</SelectItem>
                      <SelectItem value="warning">🟡 Warning (Caution)</SelectItem>
                      <SelectItem value="critical">🔴 Critical (Alert)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Message Content</Label>
                  <Textarea 
                    placeholder="Provide details for the community..."
                    className="min-h-[120px] rounded-2xl resize-none"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Megaphone className="w-5 h-5 mr-2" />}
                  Broadcast to Everyone
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-xl font-headline font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" /> Recent Broadcasts
          </h3>
          
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
          ) : announcements.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed">
              <p className="text-slate-400 font-medium">No announcements posted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <Card key={a.id} className="rounded-2xl border-none shadow-sm bg-white overflow-hidden group">
                  <div className="flex">
                    <div className={cn(
                      "w-2",
                      a.urgency === 'critical' ? "bg-red-500" : a.urgency === 'warning' ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <div className="p-6 flex-grow flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getUrgencyIcon(a.urgency)}
                          <span className="font-bold text-slate-900">{a.title}</span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{a.message}</p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pt-2">
                          Posted {a.createdAt ? format(a.createdAt.toDate(), 'MMM dd, HH:mm') : 'Recently'}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50"
                        onClick={() => handleDelete(a.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
