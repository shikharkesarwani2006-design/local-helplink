"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Sparkles, 
  Send, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Phone,
  MessageSquare,
  AppWindow,
  X,
  Plus
} from "lucide-react";
import { draftHelpRequest } from "@/ai/flows/draft-help-request";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

export default function NewRequest() {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    urgency: "normal" as "normal" | "medium" | "critical",
    area: "",
    lat: null as number | null,
    lng: null as number | null,
    contactPreference: "in-app",
    skills: [] as string[],
  });
  
  const [skillInput, setSkillInput] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const handleAIDraft = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Initial info needed",
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
        description: result.improvedDescription,
        category: result.suggestedCategory,
        urgency: result.suggestedUrgency as any,
      }));

      toast({
        title: "AI Optimization Complete",
        description: "Your request details have been refined for clarity.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Draft Failed",
        description: "Could not use AI drafting right now.",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleGeoLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Geolocation is not supported by your browser.",
      });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          area: prev.area || "Detected Location"
        }));
        setIsLocating(false);
        toast({
          title: "Location Detected",
          description: "Latitude and longitude captured successfully.",
        });
      },
      () => {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Please enable location services for this feature.",
        });
        setIsLocating(false);
      }
    );
  };

  const addSkill = () => {
    if (skillInput && !formData.skills.includes(skillInput)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, skillInput] }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const calculateExpiry = (urgency: string) => {
    const now = new Date();
    if (urgency === "critical") now.setHours(now.getHours() + 2);
    else if (urgency === "medium") now.setHours(now.getHours() + 12);
    else now.setHours(now.getHours() + 24);
    return Timestamp.fromDate(now);
  };

  const handleSubmit = async () => {
    if (!user || !db) return;

    setIsSubmitting(true);
    try {
      const expiresAt = calculateExpiry(formData.urgency);

      const docRef = await addDoc(collection(db, "requests"), {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        urgency: formData.urgency,
        location: {
          area: formData.area,
          lat: formData.lat,
          lng: formData.lng,
        },
        skills: formData.skills,
        contactPreference: formData.contactPreference,
        createdBy: user.uid,
        status: "open",
        acceptedBy: null,
        createdAt: Timestamp.now(),
        expiresAt: expiresAt,
        postedByName: user.displayName || user.email?.split('@')[0] || "Member",
      });

      toast({
        title: "Request Live!",
        description: `Request #${docRef.id.slice(-4)} broadcasted successfully.`,
      });
      
      router.push("/requests/my");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.title.length > 0 && formData.description.length > 0 && formData.title.length <= 100 && formData.description.length <= 500;
  const isStep2Valid = formData.area.length > 0;

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      
      <main className="container max-w-2xl px-6 mx-auto mt-8 space-y-8">
        {/* Progress Header */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-headline font-bold text-secondary">Broadcast Need</h1>
              <p className="text-slate-500">Step {step} of 3: {step === 1 ? "Details" : step === 2 ? "Location" : "Review"}</p>
            </div>
            <div className="text-right text-xs font-bold text-slate-400 uppercase tracking-widest">
              {Math.round((step / 3) * 100)}% Complete
            </div>
          </div>
          <Progress value={(step / 3) * 100} className="h-2" />
        </div>

        <Card className="shadow-2xl border-none overflow-hidden">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <Sparkles className="w-5 h-5 text-amber-500" />}
              {step === 2 && <MapPin className="w-5 h-5 text-primary" />}
              {step === 3 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {step === 1 ? "What do you need help with?" : step === 2 ? "Where is help needed?" : "Confirm and Broadcast"}
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-8 min-h-[400px]">
            {/* STEP 1: DETAILS */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="title">Help Title</Label>
                    <span className={cn("text-xs font-medium", formData.title.length > 100 ? "text-destructive" : "text-slate-400")}>
                      {formData.title.length}/100
                    </span>
                  </div>
                  <Input
                    id="title"
                    placeholder="e.g., Need help moving boxes or Physics tutoring"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value.slice(0, 110) })}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => setFormData({ ...formData, category: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blood">🩸 Blood Donation</SelectItem>
                        <SelectItem value="tutor">📚 Academic / Tutor</SelectItem>
                        <SelectItem value="repair">🔧 Repair / Technical</SelectItem>
                        <SelectItem value="emergency">🚨 Emergency</SelectItem>
                        <SelectItem value="other">💬 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Preference</Label>
                    <Select
                      value={formData.contactPreference}
                      onValueChange={(val) => setFormData({ ...formData, contactPreference: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in-app">💬 In-App Chat</SelectItem>
                        <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                        <SelectItem value="call">📞 Phone Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="description">Detailed Description</Label>
                    <div className="flex items-center gap-4">
                      <span className={cn("text-xs font-medium", formData.description.length > 500 ? "text-destructive" : "text-slate-400")}>
                        {formData.description.length}/500
                      </span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-secondary h-7 gap-1 hover:bg-secondary/10"
                        onClick={handleAIDraft}
                        disabled={isDrafting}
                      >
                        {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                        AI Optimize
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="description"
                    placeholder="Describe exactly what you need and any prerequisites..."
                    className="min-h-[120px]"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 550) })}
                    required
                  />
                </div>

                <div className="space-y-4">
                  <Label>Urgency Level</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "critical", label: "Critical", icon: "🔴", time: "2h exp.", color: "border-red-500 bg-red-50" },
                      { id: "medium", label: "Medium", icon: "🟡", time: "12h exp.", color: "border-amber-500 bg-amber-50" },
                      { id: "normal", label: "Normal", icon: "🟢", time: "24h exp.", color: "border-emerald-500 bg-emerald-50" }
                    ].map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, urgency: level.id as any })}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all hover:scale-105",
                          formData.urgency === level.id ? level.color : "border-slate-100 bg-white"
                        )}
                      >
                        <span className="text-2xl mb-1">{level.icon}</span>
                        <span className="text-xs font-bold uppercase tracking-tight">{level.label}</span>
                        <span className="text-[10px] text-slate-400 mt-1">{level.time}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Specific Skills Needed (Optional)</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="e.g. JavaScript, Heavy Lifting" 
                      value={skillInput} 
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addSkill}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {formData.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="gap-1 px-3 py-1">
                        {skill}
                        <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeSkill(skill)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: LOCATION */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20 flex flex-col items-center text-center space-y-4">
                    <MapPin className="w-12 h-12 text-primary" />
                    <div>
                      <h3 className="font-bold text-lg">Auto-Detect Location</h3>
                      <p className="text-sm text-slate-500">Capture your current coordinates for faster help</p>
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleGeoLocation} 
                      disabled={isLocating}
                      className="bg-primary hover:bg-primary/90 rounded-full px-8 shadow-md"
                    >
                      {isLocating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                      {formData.lat ? "Update Coordinates" : "Use GPS"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area">Service Area / Landmark</Label>
                    <Input
                      id="area"
                      placeholder="e.g. Main Library, Floor 3 or Neighborhood Name"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      required
                    />
                  </div>

                  <div className="h-32 bg-slate-100 rounded-xl border flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/map/600/300')] bg-cover" />
                    {formData.lat ? (
                      <div className="z-10 bg-white p-3 rounded-lg shadow-xl flex items-center gap-3">
                        <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">GPS Verified</p>
                          <p className="text-xs font-mono">{formData.lat.toFixed(4)}, {formData.lng?.toFixed(4)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium z-10 italic">Map preview will appear here</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 space-y-4">
                  <div>
                    <Badge variant="outline" className={cn("mb-2 uppercase", 
                      formData.urgency === 'critical' ? 'bg-red-100 text-red-700' : 
                      formData.urgency === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    )}>
                      {formData.urgency} Priority
                    </Badge>
                    <h2 className="text-2xl font-headline font-bold text-secondary">{formData.title}</h2>
                  </div>
                  
                  <p className="text-sm text-slate-600 italic leading-relaxed">"{formData.description}"</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {formData.area}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      {formData.urgency === 'critical' ? 'Expires in 2h' : formData.urgency === 'medium' ? 'Expires in 12h' : 'Expires in 24h'}
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.contactPreference === 'whatsapp' ? <MessageSquare className="w-4 h-4 text-emerald-500" /> : 
                       formData.contactPreference === 'call' ? <Phone className="w-4 h-4 text-blue-500" /> : 
                       <AppWindow className="w-4 h-4 text-secondary" />}
                      Contact via {formData.contactPreference}
                    </div>
                  </div>

                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.skills.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl text-amber-700 border border-amber-200">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs">Once broadcasted, local volunteers will be notified immediately. Please stay responsive.</p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-slate-50/50 border-t p-6 gap-4">
            {step > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={isSubmitting}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            )}
            
            {step < 3 ? (
              <Button 
                className="flex-1 bg-secondary hover:bg-secondary/90 text-white font-bold"
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
              >
                Next Step <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold h-12 text-lg shadow-lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                Broadcast Now
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
