
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
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, User, HandHelping, Wrench, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const SKILL_OPTIONS = [
  "DSA", "Python", "Maths", "Hindi", "English", 
  "First Aid", "Bike Repair", "Laptop Repair", "Other"
];

const SERVICE_CATEGORIES = [
  "Repair", "Tutoring", "Delivery", "Medical", "Cleaning", "Technical Support", "Other"
];

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
    availabilityHours: "",
  });
  const [loading, setLoading] = useState(false);
  
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

      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || "",
        role: formData.role,
        skills: formData.role === "volunteer" ? formData.skills : [],
        serviceCategory: formData.role === "provider" ? formData.serviceCategory : "",
        availabilityHours: formData.role === "provider" ? formData.availabilityHours : "",
        rating: 5.0,
        totalRatingsCount: 0,
        totalHelped: 0,
        verified: false,
        area: "",
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Account Created",
        description: "Welcome to Local HelpLink! Your profile has been set up.",
      });

      router.push("/dashboard");
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

  const roles = [
    {
      id: "user",
      title: "Regular User",
      description: "Post requests and get help from the community.",
      icon: User,
      color: "bg-blue-500",
    },
    {
      id: "volunteer",
      title: "Volunteer",
      description: "Help others in your campus using your skills.",
      icon: HandHelping,
      color: "bg-emerald-500",
    },
    {
      id: "provider",
      title: "Service Provider",
      description: "Offer professional services and repairs.",
      icon: Wrench,
      color: "bg-amber-500",
    }
  ];

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
            {step === 1 ? "Join the Network" : "Choose Your Role"}
          </CardTitle>
          <CardDescription>
            {step === 1 ? "Create your profile to start connecting" : "Tell us how you'd like to participate"}
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
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
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
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid sm:grid-cols-3 gap-4">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: role.id as any })}
                      className={cn(
                        "relative flex flex-col items-center text-center p-6 rounded-3xl border-2 transition-all duration-300 group",
                        formData.role === role.id 
                          ? "border-primary bg-primary/5 shadow-lg scale-[1.02]" 
                          : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      {formData.role === role.id && (
                        <div className="absolute top-3 right-3 bg-primary text-white p-1 rounded-full animate-in zoom-in">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                        role.color, "text-white shadow-md"
                      )}>
                        <role.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-sm mb-2">{role.title}</h3>
                      <p className="text-[10px] leading-relaxed text-slate-500">{role.description}</p>
                    </button>
                  ))}
                </div>

                {formData.role === "volunteer" && (
                  <div className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border animate-in zoom-in duration-300">
                    <Label className="font-bold text-slate-700">What are your skills?</Label>
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
                              : "bg-white text-slate-500 border border-slate-200 hover:border-primary/50"
                          )}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.role === "provider" && (
                  <div className="grid md:grid-cols-2 gap-4 p-6 bg-slate-50 rounded-[2rem] border animate-in zoom-in duration-300">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="font-bold">Service Category</Label>
                      <Select
                        value={formData.serviceCategory}
                        onValueChange={(val) => setFormData({ ...formData, serviceCategory: val })}
                      >
                        <SelectTrigger className="bg-white h-12 rounded-xl">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {SERVICE_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hours" className="font-bold">Availability (e.g. 9AM-5PM)</Label>
                      <Input
                        id="hours"
                        placeholder="Mon-Fri, 10:00 - 18:00"
                        value={formData.availabilityHours}
                        onChange={(e) => setFormData({ ...formData, availabilityHours: e.target.value })}
                        className="bg-white h-12 rounded-xl"
                      />
                    </div>
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
                className="flex-[2] h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" 
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <>
                    {step === 1 ? "Choose Role" : "Complete Registration"}
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
