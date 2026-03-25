
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Sparkles, TrendingUp, Bell, ArrowRight, Loader2, CheckCircle2, Globe, Command } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { auth } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const illustration = PlaceHolderImages.find(img => img.id === "login-illustration");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!auth) throw new Error("Auth service not available");
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      if (!auth || !db) throw new Error("Firebase services not available");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        await setDoc(userDocRef, {
          id: user.uid,
          name: user.displayName || "Member",
          email: user.email,
          phone: user.phoneNumber || "",
          role: "user",
          skills: [],
          rating: 5.0,
          totalRatingsCount: 0,
          totalHelped: 0,
          totalJobsDone: 0,
          totalEarnings: 0,
          verified: false,
          area: "",
          createdAt: serverTimestamp(),
        });
      }

      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google Login Failed",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#020617] text-slate-50 selection:bg-primary/30">
      {/* LEFT SECTION: Premium Branding Poster */}
      <section className="hidden md:flex md:w-[55%] relative flex-col justify-between p-12 lg:p-20 overflow-hidden border-r border-white/5">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e1b4b_0%,transparent_70%)] opacity-40" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-20 group transition-all">
            <div className="bg-primary/20 p-2 rounded-xl border border-primary/30 group-hover:border-primary/50 transition-colors">
              <Command className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-headline font-bold tracking-tight">StudyPro</span>
          </Link>

          <div className="space-y-8 max-w-xl">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-left duration-700">
                <Sparkles className="w-3 h-3" /> Intelligence Platform
              </div>
              <h1 className="text-5xl lg:text-7xl font-headline font-bold leading-[1.1] tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-500">
                Precision planning for <span className="text-primary italic">elite</span> results.
              </h1>
              <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-md">
                Streamline your academic workflow with AI-driven scheduling and real-time community assistance.
              </p>
            </div>

            <div className="grid gap-6 pt-4">
              {[
                { icon: Sparkles, color: "text-indigo-400", title: "Automated Workflows", desc: "AI models generated tailored study paths based on your curriculum." },
                { icon: Globe, color: "text-emerald-400", title: "Global Sync", desc: "Collaborate with peers across campus in real-time coordination hubs." },
                { icon: Bell, color: "text-blue-400", title: "Proactive Alerts", desc: "Context-aware reminders that respect your peak focus hours." }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4 group animate-in fade-in slide-in-from-left duration-700" style={{ transitionDelay: `${i * 100}ms` }}>
                  <div className="mt-1 p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
                    <feature.icon className={cn("w-4 h-4", feature.color)} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-200">{feature.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-12">
          <div className="flex items-center gap-8 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">System Integrity</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold">AES-256 Encrypted</span>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT SECTION: Minimalist Login Form */}
      <section className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-[#020617]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#1e1b4b_0%,transparent_50%)] opacity-20 pointer-events-none" />
        
        <div className="w-full max-w-[400px] space-y-10 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-3xl font-headline font-bold tracking-tight text-white">Sign in to StudyPro</h2>
            <p className="text-slate-400 font-medium">Continue to your personalized dashboard</p>
          </div>

          <div className="space-y-6">
            <Button 
              variant="outline" 
              className="w-full h-12 border-white/5 bg-white/5 hover:bg-white/10 text-slate-200 font-bold rounded-xl gap-3 transition-all active:scale-[0.98] border shadow-sm" 
              onClick={handleGoogleLogin}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em] text-slate-600"><span className="bg-[#020617] px-4">OR</span></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Work Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 pl-12 bg-white/5 border-white/5 text-slate-200 rounded-xl focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security Key</Label>
                    <Link href="#" className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider">Forgot?</Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 pl-12 bg-white/5 border-white/5 text-slate-200 rounded-xl focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 group transition-all active:scale-[0.98]" 
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : (
                  <>
                    Continue to Workspace <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-white font-bold hover:text-primary transition-colors">Join the network</Link>
            </p>
          </div>
        </div>

        {/* Mobile Footer (visible only on small screens) */}
        <div className="md:hidden mt-20 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 text-center">
          © 2024 StudyPro Intelligence
        </div>
      </section>
    </div>
  );
}
