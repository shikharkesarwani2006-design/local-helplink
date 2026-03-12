
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, User, HandHelping, Wrench, Check, ArrowRight, ArrowLeft, Plus, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const SKILL_OPTIONS = [
  "DSA", "Python", "Maths", "Hindi", "English", 
  "First Aid", "Bike Repair", "Laptop Repair", "Other"
];

const PROVIDER_CATEGORIES = [
  { label: "🔧 Bike/Vehicle Repair", value: "repair" },
  { label: "💻 Laptop/Electronics Repair", value: "repair" },
  { label: "📚 Academic Tutoring", value: "tutor" },
  { label: "🏠 Home Repair/Plumbing", value: "repair" },
  { label: "✂️ Other Services", value: "other" }
];

const EXPERIENCE_OPTIONS = ["Less than 1 year", "1-3 years", "3+ years"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "user" as "user" | "volunteer" | "provider",
    skills: [] as string[],
    serviceCategory: "",
    experience: "",
    serviceArea: "",
    availability: [] as string[],
    workingHours: { from: "09:00", to: "18:00" },
    hourlyRate: "" as string | number,
  });
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { auth } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      if (!auth) throw new Error("Firebase Auth not initialized");
      
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const profilePayload: any = {
        id: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || "",
        role: formData.role,
        verified: false,
        createdAt: serverTimestamp(),
        rating: 5.0,
        totalRatingsCount: 0,
        totalHelped: 0,
      };

      if (formData.role === "volunteer") {
        profilePayload.skills = formData.skills;
      }

      if (formData.role === "provider") {
        profilePayload.serviceCategory = formData.serviceCategory;
        profilePayload.skills = formData.skills;
        profilePayload.experience = formData.experience;
        profilePayload.serviceArea = formData.serviceArea;
        profilePayload.availability = formData.availability;
        profilePayload.workingHours = formData.workingHours;
        profilePayload.hourlyRate = formData.hourlyRate ? Number(formData.hourlyRate) : null;
        profilePayload.totalJobsDone = 0;
        profilePayload.isAvailable = true;
      }

      await setDoc(doc(db, "users", user.uid), profilePayload);

      setIsSuccess(true);
      toast({
        title: "Account Created",
        description: "Your profile has been set up successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) 
        ? prev.skills.filter(s => s !== skill) 
        : [...prev.skills, skill]
    }));
  };

  const addCustomSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.includes(day)
        ? prev.availability.filter(d => d !== day)
        : [...prev.availability, day]
    }));
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-none text-center p-8 rounded-[3rem]">
          <div className="bg-emerald-100 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold mb-2">Registration Complete!</CardTitle>
          <CardDescription className="text-lg">
            {formData.role === "provider" 
              ? "Your professional profile has been created. An admin will verify your account within 24 hours."
              : "Welcome to Local HelpLink! Your account is now active."}
          </CardDescription>
          <Button asChild className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg mt-8 shadow-xl shadow-primary/20">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-primary overflow-hidden transition-all">
        <CardHeader className="text-center space-y-2 pb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-sm -rotate-3">
              <Heart className="text-white w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-secondary">
            {step === 1 ? "Join the Network" : "Service Details"}
          </CardTitle>
          <CardDescription>
            {step === 1 ? "Create your profile to start connecting" : "Tell us about your professional expertise"}
          </CardDescription>
          <div className="flex justify-center gap-2 mt-4">
            <div className={cn("h-1.5 w-8 rounded-full transition-colors", step === 1 ? "bg-primary" : "bg-slate-200")} />
            <div className={cn("h-1.5 w-8 rounded-full transition-colors", step === 2 ? "bg-primary" : "bg-slate-200")} />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            {step === 1 ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Campus Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@university.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number {formData.role === "provider" && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required={formData.role === "provider"}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
                
                <div className="pt-4">
                  <Label className="mb-4 block font-bold">Choose your primary role:</Label>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { id: "user", title: "User", icon: User, color: "bg-blue-500" },
                      { id: "volunteer", title: "Volunteer", icon: HandHelping, color: "bg-emerald-500" },
                      { id: "provider", title: "Provider", icon: Wrench, color: "bg-amber-500" }
                    ].map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: role.id as any })}
                        className={cn(
                          "relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all group",
                          formData.role === role.id ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2 text-white shadow-sm", role.color)}>
                          <role.icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm">{role.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {formData.role === "volunteer" && (
                  <div className="space-y-4">
                    <Label className="font-bold">What are your skills?</Label>
                    <div className="flex flex-wrap gap-2">
                      {SKILL_OPTIONS.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold transition-all",
                            formData.skills.includes(skill)
                              ? "bg-primary text-white shadow-md"
                              : "bg-white text-slate-500 border border-slate-200"
                          )}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.role === "provider" && (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Service Category</Label>
                        <Select value={formData.serviceCategory} onValueChange={(val) => setFormData({ ...formData, serviceCategory: val })}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDER_CATEGORIES.map(cat => (
                              <SelectItem key={cat.label} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Professional Experience</Label>
                        <Select value={formData.experience} onValueChange={(val) => setFormData({ ...formData, experience: val })}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Experience Level" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPERIENCE_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Specific Skills / Services</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. Puncture repair, Screen replacement" 
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                        />
                        <Button type="button" size="icon" onClick={addCustomSkill} className="rounded-xl"><Plus className="w-4 h-4"/></Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.skills.map(skill => (
                          <Badge key={skill} className="gap-1 py-1">
                            {skill} <X className="w-3 h-3 cursor-pointer" onClick={() => toggleSkill(skill)}/>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Service Area Radius</Label>
                      <Input 
                        placeholder="e.g. Hostel Block A to Main Gate" 
                        value={formData.serviceArea}
                        onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-4">
                      <Label>Availability Days</Label>
                      <div className="flex flex-wrap gap-3">
                        {DAYS.map(day => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`day-${day}`} 
                              checked={formData.availability.includes(day)}
                              onCheckedChange={() => toggleDay(day)}
                            />
                            <Label htmlFor={`day-${day}`} className="text-xs font-bold">{day}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Clock className="w-3 h-3"/> Hours From</Label>
                        <Input 
                          type="time" 
                          value={formData.workingHours.from}
                          onChange={(e) => setFormData({ ...formData, workingHours: { ...formData.workingHours, from: e.target.value }})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Clock className="w-3 h-3"/> Hours To</Label>
                        <Input 
                          type="time" 
                          value={formData.workingHours.to}
                          onChange={(e) => setFormData({ ...formData, workingHours: { ...formData.workingHours, to: e.target.value }})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Hourly Rate (Optional)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <Input 
                          type="number"
                          placeholder="per hour (leave blank if free)"
                          value={formData.hourlyRate}
                          onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                          className="h-12 pl-8"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.role === "user" && (
                  <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Ready to start posting community needs!</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {step === 2 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="flex-1 h-14 rounded-2xl font-bold" 
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
              <Button 
                type="submit" 
                className="flex-[2] h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/20" 
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <>
                    {step === 1 ? "Next Step" : "Complete Registration"}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t bg-slate-50 py-6">
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-secondary font-bold hover:underline">Sign In</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
