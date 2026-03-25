
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
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  ShieldAlert, 
  MapPin, 
  Zap,
  Heart,
  AlertTriangle
} from "lucide-react";
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

  const communityImage = PlaceHolderImages.find(img => img.id === "hero-community");

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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#020617] text-slate-50 selection:bg-red-500/30">
      {/* LEFT SECTION: Branding & Awareness Poster (60%) */}
      <section className="hidden md:flex md:w-[60%] relative flex-col justify-between p-12 lg:p-20 overflow-hidden border-r border-white/5">
        {/* Background Gradients & Glows */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a192f] via-[#020617] to-black" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[150px] animate-pulse" />
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-20 group">
            <div className="bg-red-600 p-2 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-2xl font-headline font-bold tracking-tight">HelpLink</span>
          </Link>

          <div className="space-y-8 max-w-2xl">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-left duration-700">
                <ShieldAlert className="w-3 h-3" /> Real-Time Community Response
              </div>
              <h1 className="text-5xl lg:text-7xl font-headline font-bold leading-[1.1] tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-500">
                Instant Help. <br />
                <span className="text-red-500">When You Need It Most.</span>
              </h1>
              <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-lg">
                The hyperlocal network connecting neighbors with nearby help, responders, and skills in real-time.
              </p>
            </div>

            <div className="grid gap-8 pt-8">
              {[
                { icon: ShieldAlert, color: "text-red-500", title: "Emergency SOS Alerts", desc: "Broadcast critical needs to verified first-responders in your immediate vicinity." },
                { icon: MapPin, color: "text-blue-400", title: "Nearby Helpers", desc: "Instantly match with neighbors who have the specific skills you require." },
                { icon: Zap, color: "text-amber-400", title: "Real-time Connectivity", desc: "Coordinate via encrypted chat to resolve emergencies or tasks within minutes." }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-5 group animate-in fade-in slide-in-from-left duration-700" style={{ transitionDelay: `${i * 150}ms` }}>
                  <div className="mt-1 p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all">
                    <feature.icon className={cn("w-5 h-5", feature.color)} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-200">{feature.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Community Proof */}
        <div className="relative z-10 pt-12">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] flex items-center gap-6 w-fit shadow-2xl">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#020617] bg-slate-800 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 40}`} alt="user" />
                </div>
              ))}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-white">840+ Local Responders</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active in your area
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT SECTION: Minimalist Login Form (40%) */}
      <section className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-[#020617]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#1e1b4b_0%,transparent_50%)] opacity-20 pointer-events-none" />
        
        {/* Mobile Logo Only */}
        <div className="md:hidden absolute top-8 left-8">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-lg">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-headline font-bold text-lg">HelpLink</span>
          </div>
        </div>

        <div className="w-full max-w-[420px] space-y-10 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-4xl font-headline font-bold tracking-tight text-white">Welcome Back</h2>
            <p className="text-slate-400 font-medium">Sign in to access your help and support network</p>
          </div>

          <div className="space-y-6">
            <Button 
              variant="outline" 
              className="w-full h-14 border-white/5 bg-white/5 hover:bg-white/10 text-slate-200 font-bold rounded-2xl gap-3 transition-all active:scale-[0.98] border shadow-sm" 
              onClick={handleGoogleLogin}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em] text-slate-600"><span className="bg-[#020617] px-4">OR USE EMAIL</span></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email or Phone</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-red-500 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-14 pl-12 bg-white/5 border-white/5 text-slate-200 rounded-2xl focus:ring-red-500/20 focus:border-red-500/30 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security Key</Label>
                    <Link href="#" className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wider">Forgot?</Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-red-500 transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-14 pl-12 bg-white/5 border-white/5 text-slate-200 rounded-2xl focus:ring-red-500/20 focus:border-red-500/30 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-xl shadow-red-600/20 group transition-all active:scale-[0.98]" 
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin mr-2 w-5 h-5" /> : (
                  <>
                    Access Help Network <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-slate-500 font-medium">
              New to the community?{" "}
              <Link href="/auth/register" className="text-white font-bold hover:text-red-500 transition-colors">Create your account</Link>
            </p>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="md:hidden mt-20 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 text-center">
          © 2024 HelpLink Network
        </div>
      </section>
    </div>
  );
}
