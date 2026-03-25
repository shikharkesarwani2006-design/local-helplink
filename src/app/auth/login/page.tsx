
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
import { Mail, Lock, Sparkles, TrendingUp, Bell, ArrowRight, Loader2, Github, CheckCircle2 } from "lucide-react";
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-white overflow-hidden">
      {/* LEFT SECTION: Poster / Branding */}
      <section className="hidden md:flex md:w-3/5 relative flex-col justify-center px-12 lg:px-24 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 animate-in fade-in slide-in-from-left duration-1000">
        {/* Floating Shapes */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-primary-foreground text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" /> AI-Powered Platform
            </div>
            <h1 className="text-6xl lg:text-8xl font-headline font-bold leading-[0.9] tracking-tighter">
              Smart Study <br /> <span className="text-primary italic">Planner</span>
            </h1>
            <p className="text-xl lg:text-2xl text-slate-300 max-w-lg font-medium leading-relaxed">
              Plan smarter. Study better. Achieve more.
            </p>
          </div>

          <div className="grid gap-6">
            {[
              { icon: Sparkles, color: "text-amber-400", title: "AI-powered study plans", desc: "Adaptive schedules tailored to your pace." },
              { icon: TrendingUp, color: "text-emerald-400", title: "Track progress & streaks", desc: "Visualize your growth with smart analytics." },
              { icon: Bell, color: "text-blue-400", title: "Smart reminders & alerts", desc: "Never miss a deadline with automated pings." }
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="mt-1 p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                  <feature.icon className={cn("w-5 h-5", feature.color)} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative h-64 lg:h-80 w-full rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 ring-8 ring-white/5 rotate-1">
            {illustration && (
              <Image
                src={illustration.imageUrl}
                alt={illustration.description}
                fill
                className="object-cover opacity-80"
                data-ai-hint={illustration.imageHint}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4 text-white" /></div>
                <p className="text-xs font-bold text-slate-200 uppercase tracking-widest">System Operational: 99.9% uptime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT SECTION: Login Form */}
      <section className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 animate-in fade-in slide-in-from-right duration-1000 relative">
        {/* Mobile Header (Only on small screens) */}
        <div className="md:hidden text-center mb-12 space-y-2">
          <h1 className="text-4xl font-headline font-bold">Smart Study Planner</h1>
          <p className="text-slate-400 text-sm">Plan smarter. Study better.</p>
        </div>

        <Card className="w-full max-w-md bg-white/5 backdrop-blur-2xl border-white/10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12">
            <Sparkles className="w-24 h-24 text-white" />
          </div>
          
          <CardHeader className="text-center space-y-2 pt-10">
            <CardTitle className="text-3xl font-headline font-bold text-white flex items-center justify-center gap-2">
              Welcome Back 👋
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              Access your personalized study workspace
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-10 px-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Campus Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-14 pl-12 bg-slate-900/50 border-white/5 text-white rounded-2xl focus:ring-primary/20 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-400">Password</Label>
                    <Link href="#" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">Forgot?</Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-14 pl-12 bg-slate-900/50 border-white/5 text-white rounded-2xl focus:ring-primary/20 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/20 group transition-all active:scale-95" 
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : (
                  <>
                    Sign In <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em]"><span className="bg-slate-950 px-4 text-slate-500">Secure SSO</span></div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-14 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl gap-3 transition-all active:scale-95" 
              onClick={handleGoogleLogin}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </Button>

            <p className="text-center mt-10 text-sm text-slate-500 font-medium">
              New to the platform?{" "}
              <Link href="/auth/register" className="text-primary font-bold hover:underline">Create an account</Link>
            </p>
          </CardContent>
        </Card>

        {/* Floating background shape for right side */}
        <div className="absolute top-1/4 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -z-10" />
      </section>
    </div>
  );
}
