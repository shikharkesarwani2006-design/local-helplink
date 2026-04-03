
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Heart, 
  Zap, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  Star, 
  Droplets, 
  BookOpen, 
  Wrench, 
  AlertTriangle, 
  ShieldCheck, 
  Users, 
  MapPin, 
  Bell, 
  Activity,
  Globe,
  Trophy,
  Navigation,
  Loader2,
  Mail,
  Shield,
  FileText,
  Phone,
  Info,
  CircleDollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useToast } from "@/hooks/use-toast";
import { InfoModal } from "@/components/landing/InfoModal";

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);

  // Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Safely extract the map image URL
  const mapImageData = PlaceHolderImages.find(img => img.id === 'map-preview');
  const mapImageUrl = mapImageData?.imageUrl || null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isUserLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isUserLoading, router, mounted]);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleHeroBoardClick = () => {
    if (user) {
      router.push("/leaderboard");
    } else {
      document.getElementById("stats-bar")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleBloodRegistryClick = () => {
    if (user) {
      router.push("/blood-donors");
    } else {
      toast({
        title: "Authentication Required",
        description: "Login to access the private Blood Registry.",
      });
      router.push("/auth/login");
    }
  };

  const handleNewsletterJoin = async () => {
    if (!newsletterEmail.trim()) {
      toast({ variant: "destructive", title: "Email required", description: "Please enter your email address." });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      toast({ variant: "destructive", title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }

    setSubmittingNewsletter(true);
    try {
      await addDoc(collection(db, "newsletter"), {
        email: newsletterEmail,
        subscribedAt: serverTimestamp()
      });
      toast({ title: "✅ Thanks for subscribing!", description: "You are now on the neighborhood impact list." });
      setNewsletterEmail("");
    } catch (e) {
      toast({ variant: "destructive", title: "Subscription failed", description: "Please try again later." });
    } finally {
      setSubmittingNewsletter(false);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) return null;

  if (isUserLoading || user) {
    return (
      <div className="min-h-screen bg-[#0A0F2C] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#FF4D2E] mb-4" />
        <p className="text-sm font-bold text-white/40 uppercase tracking-widest animate-pulse">
          Synchronizing Network...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0F2C] text-white selection:bg-[#FF4D2E]/30 overflow-hidden font-body">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-6 bg-[#0A0F2C]/80 backdrop-blur-xl sticky top-0 z-[100] border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#FF4D2E] p-2 rounded-xl shadow-[0_0_20px_rgba(255,77,46,0.3)]">
            <Heart className="text-white w-6 h-6 fill-white" />
          </div>
          <span className="text-2xl font-bold tracking-tighter font-headline">HelpLink</span>
        </div>
        <div className="hidden lg:flex gap-10">
          <a 
            href="#how-it-works" 
            onClick={(e) => handleSmoothScroll(e, "how-it-works")}
            className="text-sm font-bold text-slate-400 hover:text-[#00D4C8] transition-colors cursor-pointer"
          >
            How it Works
          </a>
          <button 
            onClick={() => setActiveModal("safety-protocols")}
            className="text-sm font-bold text-slate-400 hover:text-[#00D4C8] transition-colors"
          >
            Safety Protocols
          </button>
          <button 
            onClick={handleHeroBoardClick}
            className="text-sm font-bold text-slate-400 hover:text-[#00D4C8] transition-colors"
          >
            Hero Board
          </button>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login">
            <Button variant="ghost" className="font-bold text-slate-300 hover:text-white hover:bg-white/5">Login</Button>
          </Link>
          <Link href="/auth/register">
            <Button className="bg-[#FF4D2E] hover:bg-[#FF4D2E]/90 text-white font-bold rounded-full px-8 shadow-xl shadow-[#FF4D2E]/20 transition-all active:scale-95">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F2C] via-[#0D3B38]/40 to-[#0A0F2C] z-0" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#00D4C8]/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        
        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(#FFFFFF 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="container px-6 lg:px-12 mx-auto relative z-10 grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00D4C8]/10 border border-[#00D4C8]/20 text-[#00D4C8] text-[10px] font-black uppercase tracking-[0.2em]">
              <Activity className="w-3.5 h-3.5 animate-pulse" /> Live Neighborhood Network
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold leading-[0.95] tracking-tighter text-white font-headline">
                Your Neighborhood's <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D2E] to-[#FF8A65]">Emergency & Skill Network.</span>
              </h1>
              <p className="text-xl text-[#B0B8C1] max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Connect instantly with trusted locals for emergencies, skill sharing, and community help — within your immediate area.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start pt-4">
              <Link href="/auth/register">
                <Button size="lg" className="h-16 px-10 text-lg bg-[#FF4D2E] hover:bg-[#FF4D2E]/90 text-white font-bold rounded-2xl shadow-2xl shadow-[#FF4D2E]/30 group transition-all">
                  Get Help Now <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/register?role=volunteer">
                <Button size="lg" variant="outline" className="h-16 px-10 text-lg border-2 border-[#00D4C8]/30 text-[#00D4C8] font-bold rounded-2xl hover:bg-[#00D4C8]/10 transition-all">
                  Offer Your Skills
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-6 justify-center lg:justify-start pt-8 border-t border-white/5">
               <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="w-12 h-12 rounded-2xl border-4 border-[#0A0F2C] bg-slate-800 overflow-hidden shadow-xl">
                      <Image 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 123}`} 
                        alt="Active Member" 
                        width={48} 
                        height={48}
                        className="w-full h-full object-cover"
                        data-ai-hint="member avatar"
                      />
                   </div>
                 ))}
               </div>
               <div className="space-y-0.5 text-left">
                 <p className="text-lg font-bold text-white leading-none">2,400+ Verified Helpers</p>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active in your area</p>
               </div>
            </div>
          </div>
          
          <div className="relative hidden lg:block">
            <div className="relative w-full h-[600px] bg-white/5 rounded-[4rem] border border-white/10 backdrop-blur-3xl overflow-hidden shadow-2xl">
               <div className="absolute inset-0 opacity-20">
                 {mapImageUrl && (
                   <Image 
                     src={mapImageUrl} 
                     alt="Neighborhood Map" 
                     fill 
                     className="object-cover"
                     data-ai-hint="digital map"
                   />
                 )}
               </div>
               
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-32 h-32 bg-[#00D4C8]/20 rounded-full animate-ping" />
                    <div className="absolute w-16 h-16 bg-[#00D4C8]/40 rounded-full animate-pulse" />
                    <div className="relative bg-[#00D4C8] p-4 rounded-3xl shadow-[0_0_30px_#00D4C8]">
                      <Navigation className="w-8 h-8 text-[#0A0F2C] fill-[#0A0F2C]" />
                    </div>
                  </div>
               </div>

               <div className="absolute top-12 left-12 animate-bounce" style={{ animationDuration: '4s' }}>
                  <Card className="bg-slate-900/90 border border-white/10 backdrop-blur-md rounded-2xl p-4 shadow-2xl w-56">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500/20 p-2 rounded-lg"><Wrench className="w-4 h-4 text-amber-500" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Service</p>
                        <p className="text-xs font-bold text-white">Need Plumber - 0.3km</p>
                      </div>
                    </div>
                  </Card>
               </div>

               <div className="absolute bottom-20 left-20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>
                  <Card className="bg-[#FF4D2E] border-none rounded-2xl p-4 shadow-2xl w-56 text-white">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg"><Droplets className="w-4 h-4 text-white" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-white/60 tracking-widest">Emergency</p>
                        <p className="text-xs font-bold">Medical Help - NOW</p>
                      </div>
                    </div>
                  </Card>
               </div>

               <div className="absolute top-32 right-12 animate-bounce" style={{ animationDuration: '6s', animationDelay: '0.5s' }}>
                  <Card className="bg-slate-900/90 border border-white/10 backdrop-blur-md rounded-2xl p-4 shadow-2xl w-56">
                    <div className="flex items-center gap-3">
                      <div className="bg-teal-500/20 p-2 rounded-lg"><BookOpen className="w-4 h-4 text-[#00D4C8]" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Skill</p>
                        <p className="text-xs font-bold text-white">Math Tutor Ready</p>
                      </div>
                    </div>
                  </Card>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section id="stats-bar" className="py-16 bg-[#0A0F2C] border-y border-white/5 relative z-20">
        <div className="container px-6 lg:px-12 mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          <div className="space-y-2">
            <h3 className="text-4xl lg:text-5xl font-extrabold text-[#00D4C8] tracking-tighter">2,400+</h3>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Helpers Nearby</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-4xl lg:text-5xl font-extrabold text-[#00D4C8] tracking-tighter">850+</h3>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Skills Listed</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-4xl lg:text-5xl font-extrabold text-[#00D4C8] tracking-tighter">99%</h3>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Response Rate</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-4xl lg:text-5xl font-extrabold text-[#00D4C8] tracking-tighter">15</h3>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Neighborhoods</p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-32 bg-gradient-to-b from-[#0A0F2C] to-[#0D3B38]/20">
        <div className="container px-6 lg:px-12 mx-auto">
          <div className="text-center mb-24 max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl lg:text-6xl font-extrabold text-white tracking-tighter font-headline">The 3-Step Match</h2>
            <p className="text-xl text-slate-400 font-medium">How we turn neighborhood needs into community action.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-16 relative">
            {[
              { step: "01", title: "📍 Post Your Need", desc: "Broadcast your emergency, repair, or academic request to people nearby.", icon: <MapPin className="w-10 h-10 text-[#FF4D2E]" /> },
              { step: "02", title: "🔔 Nearby Alerts", desc: "Our real-time engine alerts verified volunteers matching your specific need.", icon: <Bell className="w-10 h-10 text-[#00D4C8]" /> },
              { step: "03", title: "🤝 Connect & Resolve", desc: "Coordinate via secure in-app chat and resolve the need together.", icon: <CheckCircle2 className="w-10 h-10 text-emerald-500" /> }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-8 group">
                <div className="w-28 h-28 bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-[#00D4C8]/10 group-hover:border-[#00D4C8]/30 transition-all duration-500">
                  {item.icon}
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-[#00D4C8] uppercase tracking-widest bg-[#00D4C8]/10 px-4 py-1.5 rounded-full border border-[#00D4C8]/20">{item.step}</span>
                  <h3 className="text-2xl font-bold text-white">{item.title}</h3>
                  <p className="text-slate-400 font-medium max-w-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="community" className="py-32 bg-gradient-to-b from-[#0A0F2C] to-[#0D3B38]/10 relative overflow-hidden">
        <div className="container px-6 lg:px-12 mx-auto">
           <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-12">
                 <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter leading-none text-white font-headline">
                   Voices from our <br /><span className="text-[#00D4C8] italic">Community.</span>
                 </h2>
                 <div className="space-y-8">
                   {[
                     { name: "Rahul K.", text: "Found a verified Physics tutor in 12 minutes! The real-time matching is absolute magic for students.", avatar: "RK" },
                     { name: "Sarah M.", text: "Helped a neighbor with a flat tire late at night. The safety protocols made me feel comfortable responding.", avatar: "SM" },
                   ].map((t, i) => (
                     <div key={i} className="p-8 border border-white/5 rounded-[2rem] bg-white/5 backdrop-blur-sm space-y-6 shadow-sm hover:border-[#00D4C8]/20 transition-all">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                        </div>
                        <p className="text-lg text-slate-200 font-medium leading-relaxed italic">"{t.text}"</p>
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-[#00D4C8]/20 flex items-center justify-center border-2 border-[#00D4C8]/30 font-bold text-[#00D4C8]">
                              {t.avatar}
                           </div>
                           <div>
                              <p className="font-bold text-white">{t.name}</p>
                           </div>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
              
              <div className="bg-[#EBF4F0] p-12 md:p-20 rounded-[4rem] relative overflow-hidden group border border-teal-100">
                 <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform duration-700">
                    <Heart className="w-64 h-64 text-[#00D4C8]" />
                 </div>
                 <div className="space-y-8 relative z-10">
                    <div className="bg-[#00D4C8]/10 w-20 h-20 rounded-3xl flex items-center justify-center mb-10 border border-[#00D4C8]/20">
                      <ShieldCheck className="w-10 h-10 text-[#00D4C8]" />
                    </div>
                    <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">Ready to Make Your Neighborhood Safer?</h3>
                    <p className="text-xl text-slate-600 font-medium leading-relaxed">
                      Join thousands of campus members and residents already using HelpLink to stay safe and give back.
                    </p>
                    <div className="pt-6">
                      <Link href="/auth/register" className="inline-block">
                        <Button size="lg" className="h-16 px-12 text-xl bg-[#FF4D2E] text-white hover:bg-[#FF4D2E]/90 font-bold rounded-2xl shadow-2xl active:scale-95 transition-all">
                          Join Local HelpLink Free
                        </Button>
                      </Link>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No subscription fees • Verified Accounts Only</p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0F2C] text-slate-500 py-24 border-t border-white/5">
        <div className="container px-6 lg:px-12 mx-auto grid md:grid-cols-4 gap-16">
          <div className="space-y-8 col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="bg-[#FF4D2E]/20 p-2 rounded-xl">
                <Heart className="text-[#FF4D2E] w-6 h-6 fill-[#FF4D2E]" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight font-headline">HelpLink</span>
            </div>
            <p className="text-sm leading-relaxed font-medium">The hyperlocal platform for neighborhood emergencies and skill exchange. Building safer communities through local action.</p>
          </div>
          
          <div>
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Platform</h4>
            <ul className="space-y-5 text-sm font-bold">
              <li>
                <a 
                  href="#how-it-works" 
                  onClick={(e) => handleSmoothScroll(e, "how-it-works")}
                  className="hover:text-[#00D4C8] transition-colors cursor-pointer"
                >
                  How it Works
                </a>
              </li>
              <li>
                <button 
                  onClick={() => setActiveModal("safety-protocols")}
                  className="hover:text-[#00D4C8] transition-colors text-left"
                >
                  Safety Protocols
                </button>
              </li>
              <li>
                <button 
                  onClick={handleHeroBoardClick}
                  className="hover:text-[#00D4C8] transition-colors text-left"
                >
                  Hero Board
                </button>
              </li>
              <li>
                <button 
                  onClick={handleBloodRegistryClick}
                  className="hover:text-[#00D4C8] transition-colors text-left"
                >
                  Blood Registry
                </button>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Support</h4>
            <ul className="space-y-5 text-sm font-bold">
              <li>
                <button 
                  onClick={() => setActiveModal("safety-guidelines")}
                  className="hover:text-[#00D4C8] transition-colors text-left"
                >
                  Safety Guidelines
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveModal("privacy-policy")}
                  className="hover:text-[#00D4C8] transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveModal("terms")}
                  className="hover:text-[#00D4C8] transition-colors text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveModal("contact")}
                  className="hover:text-[#00D4C8] transition-colors text-left"
                >
                  Contact Support
                </button>
              </li>
            </ul>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Newsletter</h4>
            <p className="text-xs leading-relaxed font-medium">Stay updated with neighborhood impact reports.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email address" 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs flex-grow focus:outline-none focus:ring-1 focus:ring-[#00D4C8] text-white" 
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <Button 
                size="sm" 
                className="bg-[#00D4C8] text-[#0A0F2C] hover:bg-[#00D4C8]/90 rounded-xl h-9 font-bold px-4 border-none"
                onClick={handleNewsletterJoin}
                disabled={submittingNewsletter}
              >
                {submittingNewsletter ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="container px-6 lg:px-12 mx-auto mt-24 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
            © 2024 HelpLink Hyperlocal. Designed for community impact.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#00D4C8]">
            <ShieldCheck className="w-4 h-4" />
            Verified Campus Network
          </div>
        </div>
      </footer>

      {/* Informational Modals */}
      <InfoModal 
        isOpen={activeModal === "safety-protocols"} 
        onClose={() => setActiveModal(null)} 
        title="🛡️ Safety Protocols"
      >
        <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
          <li className="flex items-start gap-3"><Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" /> All volunteers are community verified by the HelpLink admin team.</li>
          <li className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /> Report any suspicious behavior immediately through the platform.</li>
          <li className="flex items-start gap-3"><Zap className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> Never share personal financial information or bank details with helpers.</li>
          <li className="flex items-start gap-3"><MapPin className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> Meet in public campus areas (Library, Main Gate, Canteen) when possible.</li>
          <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" /> Admin team reviews all reported content within 2 hours.</li>
          <li className="flex items-start gap-3 font-bold text-slate-900 dark:text-white"><Phone className="w-5 h-5 text-red-600 shrink-0 mt-0.5" /> Emergency contacts: Campus Security: 112</li>
        </ul>
      </InfoModal>

      <InfoModal 
        isOpen={activeModal === "safety-guidelines"} 
        onClose={() => setActiveModal(null)} 
        title="✅ Safety Guidelines"
      >
        <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
          <li className="flex items-start gap-3"><Users className="w-5 h-5 text-primary shrink-0 mt-0.5" /> Verify helper identity by checking their profile and rating before meeting.</li>
          <li className="flex items-start gap-3"><MessageSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" /> Use in-app chat for all coordination to maintain a record.</li>
          <li className="flex items-start gap-3"><Star className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /> Rate every interaction honestly to help keep the community safe.</li>
          <li className="flex items-start gap-3"><ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> Report life-threatening emergencies to campus authorities first.</li>
          <li className="flex items-start gap-3"><Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" /> HelpLink is a community coordination tool, not an emergency medical service.</li>
          <li className="flex items-start gap-3"><CircleDollarSign className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> Never pay anyone outside the app's agreed or standard campus system.</li>
        </ul>
      </InfoModal>

      <InfoModal 
        isOpen={activeModal === "privacy-policy"} 
        onClose={() => setActiveModal(null)} 
        title="🔒 Privacy Policy"
      >
        <div className="space-y-6">
          <p className="text-slate-600 dark:text-slate-400">At HelpLink, your privacy is our priority. Here is how we handle your data:</p>
          <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
            <li className="flex items-start gap-3"><FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" /> We collect only necessary data: name, email, campus location, and skills.</li>
            <li className="flex items-start gap-3"><ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> Your data is stored securely in encrypted Google Cloud/Firebase databases.</li>
            <li className="flex items-start gap-3"><Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /> We never sell or share your data with third-party advertisers.</li>
            <li className="flex items-start gap-3"><MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" /> Precise location is only shared with helpers after you accept their mission.</li>
            <li className="flex items-start gap-3"><Users className="w-5 h-5 text-primary shrink-0 mt-0.5" /> You can delete your profile and all associated data permanently at any time.</li>
          </ul>
          <p className="text-xs text-slate-400 pt-4 border-t">Data Controller: shikharkesarwani2006@gmail.com</p>
        </div>
      </InfoModal>

      <InfoModal 
        isOpen={activeModal === "terms"} 
        onClose={() => setActiveModal(null)} 
        title="📄 Terms of Service"
      >
        <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
          <li className="flex items-start gap-3"><Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" /> HelpLink is a community-driven volunteer and skill-sharing platform.</li>
          <li className="flex items-start gap-3"><Users className="w-5 h-5 text-primary shrink-0 mt-0.5" /> Users must be 18+ or have explicit guardian consent to use the service.</li>
          <li className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> Platform misuse results in immediate and permanent account suspension.</li>
          <li className="flex items-start gap-3"><Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" /> HelpLink is not liable for offline interactions between community members.</li>
          <li className="flex items-start gap-3"><CircleDollarSign className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> Service providers are independent and set their own community rates.</li>
          <li className="flex items-start gap-3"><ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" /> Administrative safety and moderation decisions are final.</li>
        </ul>
      </InfoModal>

      <InfoModal 
        isOpen={activeModal === "contact"} 
        onClose={() => setActiveModal(null)} 
        title="📞 Contact Support"
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <Mail className="w-6 h-6 text-primary" />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Support Email</p>
                <p className="font-bold text-slate-900 dark:text-white">shikharkesarwani2006@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <MapPin className="w-6 h-6 text-primary" />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Physical Location</p>
                <p className="font-bold text-slate-900 dark:text-white">MMMUT Campus, Gorakhpur, UP</p>
              </div>
            </div>
          </div>
          
          <ul className="space-y-3 text-sm text-slate-500 font-medium">
            <li className="flex items-center gap-2">• Response time: Within 24 hours</li>
            <li className="flex items-center gap-2">• For campus emergencies call: 112</li>
            <li className="flex items-center gap-2">• Report abuse through the app's report button</li>
          </ul>

          <Button 
            className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20"
            asChild
          >
            <a href="mailto:shikharkesarwani2006@gmail.com">Send Email</a>
          </Button>
        </div>
      </InfoModal>
    </div>
  );
}

const ShieldAlert = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);
