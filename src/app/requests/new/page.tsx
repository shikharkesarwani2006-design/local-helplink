
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, Timestamp, getDocs } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  X,
  Plus
} from "lucide-react";
import { draftHelpRequest } from "@/ai/flows/draft-help-request";
import { cn, calculateDistance } from "@/lib/utils";
import { sendNotification } from "@/firebase/notifications";
import { sendHighUrgencyAlerts } from "@/app/actions/alerts";

type Step = 1 | 2 | 3;

export default function NewRequest() {
  const [step, setStep] = useState<Step>(1);
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
    if (urgency === "high") now.setHours(now.getHours() + 2);
    else if (urgency === "medium") now.setHours(now.getHours() + 12);
    else now.setHours(now.getHours() + 24);
    return Timestamp.fromDate(now);
  };

  const broadcastToNearbyUsers = async (requestId: string, requestData: any) => {
    if (!db || !user) return;

    try {
      // 1. Trigger High Urgency External Alerts (Twilio/SendGrid)
      if (requestData.urgency === 'high') {
        sendHighUrgencyAlerts({
          title: requestData.title,
          description: requestData.description,
          category: requestData.category,
          area: requestData.location?.area || 'Nearby',
          postedByName: requestData.postedByName,
        });
      }

      // 2. In-App Broadcast to matching users
      const usersSnap = await getDocs(collection(db, "users"));
      const nearbyUsers = usersSnap.docs.filter(doc => {
        const u = doc.data();
        if (doc.id === user.uid) return false;
        
        const hasInterest = !u.interests || u.interests.length === 0 || u.interests.includes(requestData.category);
        
        let isNearby = true;
        if (requestData.location?.lat && u.location?.lat) {
          const dist = calculateDistance(
            requestData.location.lat,
            requestData.location.lng,
            u.location.lat,
            u.location.lng
          );
          isNearby = dist <= 5;
        }
        
        return hasInterest && isNearby;
      });

      for (const uDoc of nearbyUsers) {
        sendNotification(db, uDoc.id, {
          title: requestData.urgency === 'high' ? "🚨 URGENT MISSION NEARBY" : "New Request Nearby",
          message: `${requestData.postedByName} needs help with ${requestData.category}: "${requestData.title}"`,
          type: "accepted",
          link: `/dashboard`
        });
      }
    } catch (err) {
      console.error("Broadcast failed:", err);
    }
  };

  const handleSubmit = async () => {
    if (!user || !db) return;

    setIsSubmitting(true);
    try {
      const expiresAt = calculateExpiry(formData.urgency);
      const requestPayload = {
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
      };

      const docRef = await addDoc(collection(db, "requests"), requestPayload);

      // Trigger smart broadcast (Including external alerts if High Urgency)
      broadcastToNearbyUsers(docRef.id, requestPayload);

      toast({
        title: "Request Live!",
        description: formData.urgency === 'high' 
          ? "Broadcast sent to community responders via SMS and Email." 
          : "Your request has been broadcasted to the community.",
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

  const isStep1Valid = formData.title.length > 0 && formData.description.length > 0;
  const isStep2Valid = formData.area.length > 0;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <main className="container max-w-2xl px-6 mx-auto mt-8 space-y-8">
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

        <Card className="shadow-2xl border-none overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <Sparkles className="w-5 h-5 text-amber-500" />}
              {step === 2 && <MapPin className="w-5 h-5 text-primary" />}
              {step === 3 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {step === 1 ? "What do you need help with?" : step === 2 ? "Where is help needed?" : "Confirm and Broadcast"}
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-8 min-h-[400px]">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Help Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Need help moving boxes or Physics tutoring"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Select value={formData.contactPreference} onValueChange={(val) => setFormData({ ...formData, contactPreference: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Button variant="ghost" size="sm" className="text-secondary h-7 gap-1" onClick={handleAIDraft} disabled={isDrafting}>
                      {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                      AI Optimize
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    placeholder="Describe exactly what you need..."
                    className="min-h-[120px]"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Urgency Level</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "high", label: "High", icon: "🔴", color: "border-red-500 bg-red-50" },
                      { id: "medium", label: "Medium", icon: "🟡", color: "border-amber-500 bg-amber-50" },
                      { id: "low", label: "Low", icon: "🟢", color: "border-emerald-500 bg-emerald-50" }
                    ].map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, urgency: level.id as any })}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                          formData.urgency === level.id ? level.color : "border-slate-100 bg-white"
                        )}
                      >
                        <span className="text-2xl mb-1">{level.icon}</span>
                        <span className="text-xs font-bold uppercase">{level.label}</span>
                      </button>
                    ))}
                  </div>
                  {formData.urgency === 'high' && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-xs font-medium">
                      <AlertCircle className="w-4 h-4" />
                      External alerts (SMS/Email) will be triggered for high-urgency needs.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Specific Skills Needed (Optional)</Label>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. JavaScript" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} />
                    <Button type="button" variant="outline" size="icon" onClick={addSkill}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map(s => (
                      <Badge key={s} variant="secondary" className="gap-1">
                        {s} <X className="w-3 h-3 cursor-pointer" onClick={() => removeSkill(s)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20 flex flex-col items-center text-center space-y-4">
                  <MapPin className="w-12 h-12 text-primary" />
                  <div>
                    <h3 className="font-bold text-lg">Auto-Detect Location</h3>
                    <p className="text-sm text-slate-500">Capture your current coordinates for faster help</p>
                  </div>
                  <Button onClick={handleGeoLocation} disabled={isLocating} className="bg-primary hover:bg-primary/90 rounded-full px-8">
                    {isLocating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                    {formData.lat ? "Update Coordinates" : "Use GPS"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Service Area / Landmark</Label>
                  <Input id="area" placeholder="e.g. Main Library, Floor 3" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 space-y-4">
                  <div>
                    <Badge variant="outline" className="mb-2 uppercase">{formData.urgency} Priority</Badge>
                    <h2 className="text-2xl font-headline font-bold text-secondary">{formData.title}</h2>
                  </div>
                  <p className="text-sm text-slate-600 italic leading-relaxed">"{formData.description}"</p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {formData.area}</div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {formData.urgency === 'high' ? '2h exp.' : '24h exp.'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl text-amber-700 border border-amber-200">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs">Once broadcasted, local volunteers will be notified immediately.</p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-slate-50/50 border-t p-6 gap-4">
            {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)} className="flex-1">Back</Button>}
            {step < 3 ? (
              <Button className="flex-1 bg-secondary text-white font-bold" onClick={() => setStep((s) => (s + 1) as Step)} disabled={step === 1 ? !isStep1Valid : !isStep2Valid}>
                Next Step <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button className="flex-1 bg-primary text-white font-bold h-12" onClick={handleSubmit} disabled={isSubmitting}>
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
