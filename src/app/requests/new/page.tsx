"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { collection, addDoc, serverTimestamp, Timestamp, getDocs, query, where, increment, doc } from "firebase/firestore";
import { useFirestore, useUser, updateDocumentNonBlocking } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Sparkles, 
  Send, 
  MapPin, 
  Clock, 
  CheckCircle2,
  ChevronRight,
  Info,
  X,
  Plus,
  History,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_DESC_LENGTH = 500;

function NewRequestContent() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    title: searchParams.get("title") || "",
    description: searchParams.get("desc") || "",
    category: (searchParams.get("cat") as any) || "other",
    urgency: (searchParams.get("urg") as any) || "low",
    area: "",
    lat: null as number | null,
    lng: null as number | null,
    contactPreference: "in-app",
    skills: searchParams.get("skills") ? searchParams.get("skills")!.split(',').filter(Boolean) : [] as string[],
  });
  
  const [skillInput, setSkillInput] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ notified: number } | null>(null);
  
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const cat = searchParams.get("cat");
    const urg = searchParams.get("urg");
    const title = searchParams.get("title");
    const desc = searchParams.get("desc");
    const skills = searchParams.get("skills");

    if (cat || urg || title || desc || skills) {
      setFormData(prev => ({
        ...prev,
        category: cat || prev.category,
        urgency: (urg as any) || prev.urgency,
        title: title || prev.title,
        description: desc || prev.description,
        skills: skills ? skills.split(',').filter(Boolean) : prev.skills
      }));
    }
  }, [searchParams]);

  const handleAIDraft = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "More context needed",
        description: "Please provide a basic title and description for AI to refine.",
      });
      return;
    }

    setIsDrafting(true);
    try {
      const res = await fetch("/api/ai-optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initialTitle: formData.title, initialDescription: formData.description }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setFormData(prev => ({
        ...prev,
        title: result.improvedTitle,
        description: result.improvedDescription.slice(0, MAX_DESC_LENGTH),
        category: result.suggestedCategory,
        urgency: result.suggestedUrgency as any,
      }));

      toast({ title: "AI Draft Ready", description: "Your request has been optimized for better community response." });
    } catch (error) {
      toast({ variant: "destructive", title: "AI Unavailable", description: "Could not use AI drafting right now." });
    } finally {
      setIsDrafting(false);
    }
  };

  const notifyMatchingHelpers = async (requestId: string, request: any) => {
    if (!db) return 0;

    const [volSnaps, provSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('role', '==', 'volunteer'))),
      getDocs(query(collection(db, 'users'), where('role', '==', 'provider')))
    ]);

    const helpersToNotifyMap = new Map<string, any>();

    volSnaps.docs.forEach(doc => {
      const data = doc.data();
      if (doc.id === user!.uid) return;
      const isUrgent = request.urgency === 'high' || request.category === 'blood' || request.category === 'emergency';
      if (isUrgent || data.skills?.some((s: string) => s.toLowerCase() === request.category.toLowerCase())) {
        helpersToNotifyMap.set(doc.id, data);
      }
    });

    provSnap.docs.forEach(doc => {
      const data = doc.data();
      if (doc.id === user!.uid) return;
      if (data.serviceCategory?.toLowerCase() === request.category.toLowerCase() && data.isAvailable) {
        helpersToNotifyMap.set(doc.id, data);
      }
    });

    const getNotifMessage = (req: any) => {
      const urgencyEmoji = { high: '🔴', medium: '🟡', low: '🟢' }[req.urgency as 'high' | 'medium' | 'low'];
      const categoryEmoji: Record<string, string> = { blood: '🩸', tutor: '📚', repair: '🔧', emergency: '🚨', other: '💬' };
      return `${urgencyEmoji} ${categoryEmoji[req.category] || '💬'} New ${req.category} request near you: "${req.title}"`;
    };

    const notifPromises = Array.from(helpersToNotifyMap.keys()).map(helperId => {
      return addDoc(collection(db, 'notifications', helperId, 'items'), {
        type: 'new_request',
        requestId: requestId,
        title: request.title,
        message: getNotifMessage(request),
        urgency: request.urgency,
        read: false,
        createdAt: serverTimestamp()
      });
    });

    await Promise.all(notifPromises);
    return notifPromises.length;
  };

  const calculateExpiry = (urgency: string) => {
    const now = new Date();
    if (urgency === "high") now.setHours(now.getHours() + 2);
    else if (urgency === "medium") now.setHours(now.getHours() + 12);
    else now.setHours(now.getHours() + 24);
    return Timestamp.fromDate(now);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;

    setIsSubmitting(true);
    try {
      const expiresAt = calculateExpiry(formData.urgency);
      
      const requestPayload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        urgency: formData.urgency,
        area: formData.area,
        status: "open",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        location: { area: formData.area, lat: formData.lat, lng: formData.lng },
        skills: formData.skills,
        postedByName: user.displayName || user.email?.split('@')[0] || "Member",
        contactPreference: formData.contactPreference,
      };

      const docRef = await addDoc(collection(db, "requests"), requestPayload);
      const notifiedCount = await notifyMatchingHelpers(docRef.id, requestPayload);

      updateDocumentNonBlocking(doc(db, "users", user.uid), { totalRatingsCount: increment(1) });
      setSuccessData({ notified: notifiedCount });
      toast({ title: "Mission Broadcasted!", description: `Notified ${notifiedCount} helpers.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: "Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSkillTag = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const removeSkillTag = (tag: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== tag) });
  };

  const isValid = formData.title.length >= 5 && formData.description.length >= 10 && formData.area.length >= 3;

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-[3rem] p-12 text-center space-y-8 shadow-2xl border-none">
          <div className="bg-emerald-100 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-headline font-bold text-slate-900">Request Posted!</h2>
            <p className="text-slate-500">We've notified <span className="font-bold text-primary">{successData.notified} helpers</span>.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg">
              <Link href="/requests/my">View My Requests <History className="ml-2 w-5 h-5" /></Link>
            </Button>
            <Button variant="ghost" className="h-12 rounded-2xl font-bold text-slate-500" onClick={() => setSuccessData(null)}>Post Another</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20 pt-8">
      <main className="container max-w-5xl px-4 mx-auto grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <h1 className="text-3xl font-headline font-bold text-slate-900 dark:text-white">Broadcast a Need</h1>
          <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-950/50 border-b dark:border-slate-800">
              <CardTitle className="text-lg font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Mission Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-bold">What do you need help with?</Label>
                <Input id="title" placeholder="e.g., Need O+ Blood or Laptop Repair" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="h-12 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blood">🩸 Blood Donation</SelectItem>
                      <SelectItem value="tutor">📚 Academic Tutor</SelectItem>
                      <SelectItem value="repair">🔧 Technical Repair</SelectItem>
                      <SelectItem value="emergency">🚨 Emergency Help</SelectItem>
                      <SelectItem value="other">💬 Other Needs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Urgency</Label>
                  <Select value={formData.urgency} onValueChange={(val: any) => setFormData({ ...formData, urgency: val })}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">🔴 Critical (2hr)</SelectItem>
                      <SelectItem value="medium">🟡 Medium (12hr)</SelectItem>
                      <SelectItem value="low">🟢 Normal (24hr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><Label htmlFor="description" className="font-bold">Detailed Description</Label><Button variant="ghost" size="sm" className="text-primary font-bold gap-1" onClick={handleAIDraft} disabled={isDrafting}>{isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />} AI Optimize</Button></div>
                <Textarea id="description" placeholder="Provide details for coordination..." className="min-h-[140px] rounded-2xl" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="space-y-2"><Label htmlFor="area" className="font-bold">Landmark / Area</Label><Input id="area" placeholder="e.g. Science Block, Room 204" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} className="h-12 rounded-xl" /></div>
              
              <div className="space-y-4">
                <Label className="font-bold">Required Skills / Tags</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. CPR, Java, Plumbing..." 
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillTag())}
                    className="h-11 rounded-xl"
                  />
                  <Button type="button" size="icon" onClick={addSkillTag} className="rounded-xl h-11 w-11"><Plus className="w-4 h-4"/></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map(skill => (
                    <Badge key={skill} variant="secondary" className="gap-1 py-1.5 px-3 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border-none">
                      {skill} <X className="w-3 h-3 cursor-pointer hover:text-red-500 transition-colors" onClick={() => removeSkillTag(skill)}/>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-6 border-t"><Button className="w-full h-14 rounded-2xl bg-primary text-white font-bold" onClick={handleSubmit} disabled={!isValid || isSubmitting}>{isSubmitting ? "Broadcasting..." : "Confirm & Broadcast"}</Button></CardFooter>
          </Card>
        </div>
        <div className="sticky top-24 space-y-6">
          <h2 className="text-xl font-headline font-bold">Feed Preview</h2>
          <Card className={cn("rounded-[2rem] border-2 shadow-2xl overflow-hidden", formData.urgency === 'high' && "border-red-500/30 animate-pulse-red")}>
            <CardHeader className="p-8 pb-4">
              <Badge className="w-fit mb-4">{formData.category}</Badge>
              <CardTitle className="text-2xl font-headline font-bold">{formData.title || "Help Needed"}</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <p className="text-slate-500 text-sm leading-relaxed mb-4">{formData.description || "Start typing to preview..."}</p>
              <div className="flex flex-wrap gap-1.5">
                {formData.skills.map(s => (
                  <Badge key={s} variant="outline" className="text-[10px] font-bold border-slate-200">{s}</Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-slate-50/50 flex justify-between"><div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> <span className="text-xs font-bold text-slate-400">{formData.area || "Location TBD"}</span></div><Button size="sm" className="rounded-full font-bold pointer-events-none opacity-50">Accept Mission</Button></CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function NewRequest() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
      <NewRequestContent />
    </Suspense>
  );
}
