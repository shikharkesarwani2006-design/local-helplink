"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
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
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isUserLoading || user) {
    return (
      <div className="min-h-screen bg-[#0A0F2C] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#FF4D2E] mb-4" />
        <p className="text-sm font-bold text-white/40 uppercase tracking-widest animate-pulse">
          Initializing Security Context...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0F2C] text-white selection:bg-[#FF4D2E]/30 overflow-hidden font-['Plus_Jakarta_Sans',_sans-serif]">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-6 bg-[#0A0F2C]/80 backdrop-blur-xl sticky top-0 z-[100] border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#FF4D2E] p-2 rounded-xl shadow-[0_0_20px_rgba(255,77,46,0.3)]">
            <Heart className="text-white w-6 h-6 fill-white" />
          </div>
          <span className="text-2xl font-bold tracking-tighter">HelpLink</span>
        </div>
        <div className="hidden lg:flex gap-10">
          <Link href="#how-it-works" className="text-sm font-bold text-slate-400 hover:text-[#00D4C8] transition-colors">How it Works</Link>
          <Link href="#features" className="text-sm font-bold text-slate-400 hover:text-[#00D4C8] transition-colors">Safety Protocols</Link>
          <Link href="#community" className="text-sm font-bold text-slate-400 hover:text-[#00D4C8] transition-colors">Community</Link>
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
        {/* Visual Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F2C] via-[#0D3B38]/40 to-[#0A0F2C] z-0" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#00D4C8]/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#FF4D2E]/5 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(#FFFFFF 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="container px-6 lg:px-12 mx-auto relative z-10 grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00D4C8]/10 border border-[#00D4C8]/20 text-[#00D4C8] text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-left duration-700">
              <Activity className="w-3.5 h-3.5 animate-pulse" /> Live Neighborhood Network
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold leading-[0.95] tracking-tighter text-white">
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
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 42}`} alt="user" className="w-full h-full object-cover" />
                   </div>
                 ))}
               </div>
               <div className="space-y-0.5">
                 <p className="text-lg font-bold text-white leading-none">2,400+ Verified Helpers</p>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active in your neighborhood</p>
               </div>
            </div>
          </div>
          
          <div className="relative hidden lg:block">
            {/* Animated Location Pins & Map Visualization */}
            <div className="relative w-full h-[600px] bg-white/5 rounded-[4rem] border border-white/10 backdrop-blur-3xl overflow-hidden shadow-2xl">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
               
               {/* Location Pulse */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-32 h-32 bg-[#00D4C8]/20 rounded-full animate-ping" />
                    <div className="absolute w-16 h-16 bg-[#00D4C8]/40 rounded-full animate-pulse" />
                    <div className="relative bg-[#00D4C8] p-4 rounded-3xl shadow-[0_0_30px_#00D4C8]">
                      <Navigation className="w-8 h-8 text-[#0A0F2C] fill-[#0A0F2C]" />
                    </div>
                  </div>
               </div>

               {/* Floating Mock Cards */}
               <div className="absolute top-12 left-12 animate-bounce" style={{ animationDuration: '4s' }}>
                  <Card className="bg-slate-900/90 border border-white/10 backdrop-blur-md rounded-2xl p-4 shadow-2xl w-56">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500/20 p-2 rounded-lg"><Wrench className="w-4 h-4 text-amber-500" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Service</p>
                        <p className="text-xs font-bold">Need Plumber - 0.3km</p>
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
                        <p className="text-xs font-bold">Math Tutor Ready</p>
                      </div>
                    </div>
                  </Card>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 bg-[#0A0F2C] border-y border-white/5 relative z-20">
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
            <h2 className="text-4xl lg:text-6xl font-extrabold text-white tracking-tighter">The 3-Step Match</h2>
            <p className="text-xl text-slate-400 font-medium">How we turn neighborhood needs into community action.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-16 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-white/5 -z-10" />
            
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

      {/* Features Grid */}
      <section id="features" className="py-32 bg-[#0A0F2C] relative">
        <div className="container px-6 lg:px-12 mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-24 gap-8">
            <div className="space-y-4 max-w-2xl text-center lg:text-left">
               <h2 className="text-4xl lg:text-6xl font-extrabold tracking-tighter text-white">Trust-Built Features</h2>
               <p className="text-xl text-slate-400 font-medium">Verified expertise for every neighborhood situation.</p>
            </div>
            <Link href="/auth/register">
              <Button variant="outline" className="rounded-2xl font-bold border-white/10 text-white px-8 h-14 hover:bg-white/5">View Security Protocols</Button>
            </Link>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Emergency SOS", icon: <AlertTriangle className="w-8 h-8" />, color: "text-[#FF4D2E]", desc: "Immediate broadcasting for critical medical or safety needs." },
              { title: "Skill Exchange", icon: <Zap className="w-8 h-8" />, color: "text-amber-500", desc: "Trade knowledge or services with qualified neighbors nearby." },
              { title: "Hyperlocal Feed", icon: <MapPin className="w-8 h-8" />, color: "text-[#00D4C8]", desc: "A live stream of community requests within 5km radius." },
              { title: "Verified Helpers", icon: <ShieldCheck className="w-8 h-8" />, color: "text-emerald-500", desc: "Every helper goes through identity and skill verification." },
              { title: "Real-time Chat", icon: <MessageSquare className="w-8 h-8" />, color: "text-blue-500", desc: "Coordinate and finalize details through secure messaging." },
              { title: "Trust Score", icon: <Star className="w-8 h-8" />, color: "text-purple-500", desc: "Reputation system based on community reviews and successful missions." }
            ].map((cat, i) => (
              <Card key={i} className="group rounded-[2.5rem] border-white/10 bg-white/5 backdrop-blur-xl hover:shadow-[0_0_40px_rgba(0,212,200,0.1)] hover:border-[#00D4C8]/30 transition-all duration-500 cursor-pointer overflow-hidden">
                <CardContent className="p-10 space-y-6">
                  <div className={`w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500 ${cat.color}`}>
                    {cat.icon}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-white leading-tight">{cat.title}</h3>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">{cat.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="community" className="py-32 bg-gradient-to-b from-[#0A0F2C] to-[#0D3B38]/10 relative overflow-hidden">
        <div className="container px-6 lg:px-12 mx-auto">
           <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-12">
                 <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter leading-none text-white">
                   Voices from our <br /><span className="text-[#00D4C8] italic">Community.</span>
                 </h2>
                 <div className="space-y-8">
                   {[
                     { name: "Rahul K.", loc: "MMMUT Campus", text: "Found a verified Physics tutor in 12 minutes! The real-time matching is absolute magic for students.", avatar: "RK" },
                     { name: "Sarah M.", loc: "Gorakhpur North", text: "Helped a neighbor with a flat tire late at night. The safety protocols made me feel comfortable responding.", avatar: "SM" },
                     { name: "Prof. Miller", loc: "Staff Quarters", text: "Essential for campus safety. It fosters a culture of mutual support that standard apps lack.", avatar: "PM" }
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
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t.loc}</p>
                           </div>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
              
              <div className="bg-[#FF4D2E] p-12 md:p-20 rounded-[4rem] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                    <Heart className="w-64 h-64 text-white" />
                 </div>
                 <div className="space-y-8 relative z-10">
                    <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mb-10 border border-white/30">
                      <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">Ready to Make Your Neighborhood Safer?</h3>
                    <p className="text-xl text-white/80 font-medium leading-relaxed">
                      Join thousands of campus members and residents already using HelpLink to stay safe and give back.
                    </p>
                    <div className="pt-6">
                      <Link href="/auth/register" className="inline-block">
                        <Button size="lg" className="h-16 px-12 text-xl bg-white text-[#FF4D2E] hover:bg-slate-100 font-bold rounded-2xl shadow-2xl active:scale-95 transition-all">
                          Join Local HelpLink Free
                        </Button>
                      </Link>
                    </div>
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">No subscription fees • Verified Accounts Only</p>
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
              <span className="text-2xl font-bold text-white tracking-tight">HelpLink</span>
            </div>
            <p className="text-sm leading-relaxed font-medium">The hyperlocal platform for neighborhood emergencies and skill exchange. Building safer communities through local action.</p>
            <div className="flex gap-4">
               {[1,2,3,4].map(i => (
                 <div key={i} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF4D2E] hover:text-white transition-all cursor-pointer group">
                    <Globe className="w-5 h-5 text-slate-600 group-hover:text-white" />
                 </div>
               ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Platform</h4>
            <ul className="space-y-5 text-sm font-bold">
              <li><Link href="#" className="hover:text-[#00D4C8] transition-colors">How it Works</Link></li>
              <li><Link href="#" className="hover:text-[#00D4C8] transition-colors">Safety Protocols</Link></li>
              <li><Link href="/leaderboard" className="hover:text-[#00D4C8] transition-colors">Leaderboard</Link></li>
              <li><Link href="/blood-donors" className="hover:text-[#00D4C8] transition-colors">Blood Registry</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Support</h4>
            <ul className="space-y-5 text-sm font-bold">
              <li><Link href="#" className="hover:text-[#00D4C8] transition-colors">Safety Guidelines</Link></li>
              <li><Link href="#" className="hover:text-[#00D4C8] transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-[#00D4C8] transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-[#00D4C8] transition-colors">Contact Support</Link></li>
            </ul>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Newsletter</h4>
            <p className="text-xs leading-relaxed font-medium">Stay updated with neighborhood impact reports.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email address" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs flex-grow focus:outline-none focus:ring-1 focus:ring-[#00D4C8]" />
              <Button size="sm" className="bg-[#00D4C8] text-[#0A0F2C] hover:bg-[#00D4C8]/90 rounded-xl h-9 font-bold px-4">Join</Button>
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
    </div>
  );
}
