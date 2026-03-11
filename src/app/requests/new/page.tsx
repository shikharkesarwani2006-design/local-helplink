
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, addDoc, serverTimestamp, Timestamp, getDocs, query, where } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
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
import { draftHelpRequest } from "@/ai/flows/draft-help-request";
import { cn } from "@/lib/utils";

const MAX_DESC_LENGTH = 500;

export default function NewRequest() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    urgency: "low" as "high" | "medium" | "low",
    area: "",
    lat: null as number | null,
    lng: null as number | null,
    contactPreference: "in-app",
    skills: [] as string[],
  });
  
  const [skillInput, setSkillInput] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ notified: number } | null>(null);
  
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

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
      const result = await draftHelpRequest({
        initialTitle: formData.title,
        initialDescription: formData.description,
      });

      setFormData(prev => ({
        ...prev,
        title: result.improvedTitle,
        description: result.improvedDescription.slice(0, MAX_DESC_LENGTH),
        category: result.suggestedCategory,
        urgency: result.suggestedUrgency as any,
      }));

      toast({
        title: "AI Draft Ready",
        description: "Your request has been optimized for better community response.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Unavailable",
        description: "Could not use AI drafting right now. Please continue manually.",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const notifyMatchingHelpers = async (requestId: string, request: any) => {
    if (!db) return 0;

    // 1. Query volunteers matching category or skills
    const volunteerQueries = [
      query(collection(db, 'users'), where('role', '==', 'volunteer'), where('skills', 'array-contains', request.category))
    ];
    
    if (request.skills.length > 0) {
      volunteerQueries.push(query(collection(db, 'users'), where('role', '==', 'volunteer'), where('skills', 'array-contains-any', request.skills)));
    }

    // 2. Query service providers matching category
    const providersQuery = query(collection(db, 'users'), where('role', '==', 'provider'), where('serviceCategory', '==', request.category.charAt(0).toUpperCase() + request.category.slice(1)));

    // 3. Special Case: Emergency/Blood/High Urgency - Notify ALL Volunteers
    const allVolunteersQuery = query(collection(db, 'users'), where('role', '==', 'volunteer'));

    const snaps = await Promise.all([
      ...volunteerQueries.map(q => getDocs(q)),
      getDocs(providersQuery)
    ]);

    let helpersToNotifyMap = new Map<string, any>();

    if (request.urgency === 'high' || request.category === 'blood' || request.category === 'emergency') {
      const allVolSnap = await getDocs(allVolunteersQuery);
      allVolSnap.docs.forEach(d => helpersToNotifyMap.set(d.id, d.data()));
    } else {
      snaps.forEach(snap => {
        snap.docs.forEach(d => helpersToNotifyMap.set(d.id, d.data()));
      });
    }

    // Remove self if I am a helper
    helpersToNotifyMap.delete(user!.uid);

    const getNotifMessage = (req: any) => {
      const urgencyEmoji = { high: '🔴', medium: '🟡', low: '🟢' }[req.urgency as 'high' | 'medium' | 'low'];
      const categoryEmoji: Record<string, string> = { blood: '🩸', tutor: '📚', repair: '🔧', emergency: '🚨', other: '💬' };
      return `${urgencyEmoji} ${categoryEmoji[req.category] || '💬'} New ${req.category} request near you: "${req.title}" — ${req.area}`;
    };

    const notifPromises = Array.from(helpersToNotifyMap.keys()).map(helperId => {
      return addDoc(collection(db, 'notifications', helperId, 'items'), {
        type: 'new_request',
        category: request.category,
        urgency: request.urgency,
        requestId: requestId,
        title: request.title,
        area: request.area,
        message: getNotifMessage(request),
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
        location: {
          area: formData.area,
          lat: formData.lat,
          lng: formData.lng,
        },
        skills: formData.skills,
        postedByName: user.displayName || user.email?.split('@')[0] || "Member",
        contactPreference: formData.contactPreference,
      };

      const docRef = await addDoc(collection(db, "requests"), requestPayload);
      const notifiedCount = await notifyMatchingHelpers(docRef.id, requestPayload);

      setSuccessData({ notified: notifiedCount });
      
      toast({
        title: "Mission Broadcasted!",
        description: `Notified ${notifiedCount} helpers in your area.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "We couldn't post your request. Please try again.",
      });
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

  const isValid = 
    formData.title.length >= 5 && 
    formData.description.length >= 10 && 
    formData.area.length >= 3;

  const urgencyOptions = [
    { id: "high", label: "Critical", icon: "🔴", color: "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600", desc: "2hr Response" },
    { id: "medium", label: "Medium", icon: "🟡", color: "border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-600", desc: "12hr Response" },
    { id: "low", label: "Normal", icon: "🟢", color: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600", desc: "24hr Response" }
  ];

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-[3rem] p-12 text-center space-y-8 shadow-2xl border-none">
          <div className="bg-emerald-100 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-headline font-bold text-slate-900">Request Posted!</h2>
            <p className="text-slate-500">
              We've notified <span className="font-bold text-primary">{successData.notified} helpers</span> matching your needs.
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next Step</p>
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              Helpers are reviewing your request. You'll receive a notification here as soon as someone accepts.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg">
              <Link href="/requests/my">View My Requests <History className="ml-2 w-5 h-5" /></Link>
            </Button>
            <Button variant="ghost" className="h-12 rounded-2xl font-bold text-slate-500" onClick={() => setSuccessData(null)}>
              Post Another Need
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20 pt-8">
      <main className="container max-w-5xl px-4 mx-auto grid lg:grid-cols-2 gap-8 items-start">
        
        {/* Form Section */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold text-slate-900 dark:text-white">Broadcast a Need</h1>
            <p className="text-slate-500 text-sm">Fill in the details to notify verified neighbors nearby.</p>
          </div>

          <Card className="shadow-xl border-none bg-white dark:bg-slate-900 overflow-hidden rounded-3xl">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-950/50 border-b dark:border-slate-800">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Mission Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-bold">What do you need help with?</Label>
                <Input
                  id="title"
                  placeholder="e.g., Need O+ Blood or Laptop Repair"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="blood">🩸 Blood Donation</SelectItem>
                      <SelectItem value="tutor">📚 Academic Tutor</SelectItem>
                      <SelectItem value="repair">🔧 Technical Repair</SelectItem>
                      <SelectItem value="emergency">🚨 Emergency Help</SelectItem>
                      <SelectItem value="other">💬 Other Needs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Contact Method</Label>
                  <Select value={formData.contactPreference} onValueChange={(val) => setFormData({ ...formData, contactPreference: val })}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="in-app">💬 In-App Chat</SelectItem>
                      <SelectItem value="call">📞 Phone Call</SelectItem>
                      <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-bold">Urgency Level</Label>
                <div className="grid grid-cols-3 gap-3">
                  {urgencyOptions.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: level.id as any })}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200 text-center",
                        formData.urgency === level.id 
                          ? level.color 
                          : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200"
                      )}
                    >
                      <span className="text-xl mb-1">{level.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-tighter">{level.label}</span>
                      <span className="text-[9px] text-slate-400 font-bold hidden xs:block">{level.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Targeted Skills (Optional Tags)</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. Python, Plumber, First Aid" 
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillTag())}
                    className="h-11 rounded-xl"
                  />
                  <Button type="button" size="icon" variant="secondary" className="rounded-xl" onClick={addSkillTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map(skill => (
                    <Badge key={skill} className="bg-primary/10 text-primary hover:bg-primary/20 border-none gap-1 py-1 px-3">
                      {skill}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeSkillTag(skill)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description" className="font-bold">Detailed Description</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary h-7 px-2 font-bold gap-1 hover:bg-primary/5" 
                    onClick={handleAIDraft} 
                    disabled={isDrafting}
                  >
                    {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                    AI Optimize
                  </Button>
                </div>
                <div className="relative">
                  <Textarea
                    id="description"
                    placeholder="Provide enough detail for someone to help..."
                    className="min-h-[140px] rounded-2xl resize-none pr-4 pb-8"
                    value={formData.description}
                    maxLength={MAX_DESC_LENGTH}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <div className={cn(
                    "absolute bottom-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full",
                    formData.description.length >= MAX_DESC_LENGTH ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {formData.description.length} / {MAX_DESC_LENGTH}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area" className="font-bold">Precise Location / Landmark</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="area"
                    placeholder="e.g. Science Block, Room 204"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="pl-11 h-12 rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 dark:bg-slate-950/50 p-6 border-t dark:border-slate-800">
              <Button 
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                {isSubmitting ? "Broadcasting..." : "Confirm & Broadcast"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Live Preview Section */}
        <div className="sticky top-24 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-headline font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" /> Feed Preview
            </h2>
            <p className="text-slate-500 text-sm">This is how your request will appear to neighbors.</p>
          </div>

          <div className="relative group perspective-1000">
            {/* Animated background glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
            
            <Card className={cn(
              "relative overflow-hidden transition-all duration-500 bg-white dark:bg-slate-900 rounded-[2rem] border-2 shadow-2xl flex flex-col min-h-[380px]",
              formData.urgency === 'high' ? "border-red-500/30 animate-pulse-red" : "border-slate-100 dark:border-slate-800"
            )}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-4">
                  <Badge className={cn(
                    "capitalize px-4 py-1.5 font-black text-[10px] rounded-full border-2",
                    formData.urgency === 'high' ? "border-red-500/50 bg-red-50 text-red-600" :
                    formData.urgency === 'medium' ? "border-amber-500/50 bg-amber-50 text-amber-600" :
                    "border-emerald-500/50 bg-emerald-50 text-emerald-600"
                  )}>
                    {formData.urgency === 'high' ? 'critical' : formData.urgency === 'medium' ? 'medium' : 'normal'}
                  </Badge>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Just Now
                  </span>
                </div>
                <CardTitle className="text-2xl font-headline font-bold text-slate-900 dark:text-white leading-tight min-h-[3rem]">
                  {formData.title || "Help Needed"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div className="min-h-[80px]">
                  <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-wrap">
                    {formData.description || "Start typing your description to see it appear here..."}
                  </p>
                </div>
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{formData.area || "Location TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-secondary dark:text-indigo-400 uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Community Verified Member</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-6 bg-slate-50/80 dark:bg-slate-950/50 flex justify-between items-center mt-auto border-t dark:border-slate-800">
                <div className="flex items-center gap-2">
                   <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                     {user?.displayName?.[0] || user?.email?.[0] || "?"}
                   </div>
                   <span className="text-xs font-bold text-slate-700 dark:text-slate-400">
                    {user?.displayName || "You"}
                   </span>
                </div>
                <Button size="sm" className="bg-slate-200 dark:bg-slate-800 text-slate-400 rounded-full font-bold h-9 px-5 pointer-events-none opacity-50">
                  Accept <ChevronRight className="ml-1 w-3 h-3" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-3xl border-2 border-dashed border-amber-200 dark:border-amber-900/50 flex gap-4">
            <Info className="w-6 h-6 text-amber-500 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Broadcast Guidelines</h4>
              <p className="text-[11px] text-amber-700/70 dark:text-amber-500/70 leading-relaxed">
                Your request will be visible to all verified neighbors within 5km. Be clear about your needs and stay safe by meeting in public campus areas when possible.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
