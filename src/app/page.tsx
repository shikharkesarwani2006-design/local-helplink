
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { 
  Heart, 
  Zap, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  Star, 
  Globe, 
  Droplets, 
  BookOpen, 
  Wrench, 
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [counts, setCounts] = useState({ resolved: 0, users: 0, time: 0 });

  const heroImage = PlaceHolderImages.find((img) => img.id === "hero-community");

  // Redirect if logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isUserLoading, router]);

  // Animation for stats
  useEffect(() => {
    setMounted(true);
    if (!user) {
      const interval = setInterval(() => {
        setCounts(prev => ({
          resolved: prev.resolved < 1250 ? prev.resolved + 13 : 1250,
          users: prev.users < 840 ? prev.users + 9 : 840,
          time: prev.time < 12 ? prev.time + 1 : 12,
        }));
      }, 30);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (isUserLoading || user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Entering Network...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* Public Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
            <Heart className="text-white w-6 h-6 fill-white" />
          </div>
          <span className="text-2xl font-headline font-bold text-slate-900 tracking-tight">CampusConnect</span>
        </div>
        <div className="hidden md:flex gap-8">
          <Link href="#how-it-works" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">How it Works</Link>
          <Link href="#categories" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Support Channels</Link>
          <Link href="#testimonials" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Success Stories</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login">
            <Button variant="ghost" className="font-bold text-slate-600">Login</Button>
          </Link>
          <Link href="/auth/register">
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-full px-6 shadow-lg shadow-primary/20">
              Join Now
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-white">
        <div className="container px-6 mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5 fill-primary" /> Hyperlocal Help Network
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-headline font-bold leading-[0.9] text-slate-900 tracking-tighter">
              Get Help. Give Help. <span className="text-primary">Instantly. 🤝</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              Hyperlocal emergency & skill exchange for your campus community. Your neighborhood network, strengthened by collective action.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
              <Link href="/auth/register">
                <Button size="lg" className="h-16 px-10 text-xl bg-primary hover:bg-primary/90 text-white font-bold rounded-full shadow-2xl shadow-primary/30 group">
                  Get Help Now <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/register?role=volunteer">
                <Button size="lg" variant="outline" className="h-16 px-10 text-xl border-2 border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-50">
                  Volunteer
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-4 justify-center lg:justify-start pt-4">
               <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="user" />
                   </div>
                 ))}
               </div>
               <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">+800 Joined this month</div>
            </div>
          </div>
          
          <div className="relative">
            <div className="relative h-[550px] w-full rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border-8 border-white rotate-2">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  fill
                  priority
                  className="object-cover"
                  data-ai-hint={heroImage.imageHint}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] shadow-2xl border border-white/20">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Mission Resolved</p>
                    <p className="text-xs text-slate-500 font-medium italic leading-relaxed">"Found a verified physics tutor in 12 minutes!"</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
          </div>
        </div>
      </section>

      {/* Stats Counter Bar */}
      <section className="py-16 bg-slate-900 text-white relative z-20">
        <div className="container px-6 mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="space-y-2">
            <h3 className="text-6xl font-headline font-bold text-primary">{mounted ? counts.resolved : 0}+</h3>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Requests Resolved</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-6xl font-headline font-bold text-primary">{mounted ? counts.users : 0}+</h3>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Verified Volunteers</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-6xl font-headline font-bold text-primary">{mounted ? counts.time : 0}m</h3>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Avg Response Time</p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-32 bg-white">
        <div className="container px-6 mx-auto">
          <div className="text-center mb-24 max-w-2xl mx-auto space-y-4">
            <h2 className="text-5xl font-headline font-bold text-slate-900 tracking-tight">The 3-Step Match</h2>
            <p className="text-xl text-slate-500 font-medium">How we turn neighborhood needs into community action.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-16 relative">
            <div className="hidden md:block absolute top-1/3 left-0 w-full h-0.5 bg-slate-50 -z-10" />
            
            {[
              { step: "01", title: "📢 Post your need", desc: "Broadcast your emergency, repair, or academic request to people nearby.", icon: <MessageSquare className="w-10 h-10 text-primary" /> },
              { step: "02", title: "🔔 Helpers notified", desc: "Our real-time engine alerts verified volunteers matching your specific need.", icon: <Zap className="w-10 h-10 text-amber-500 fill-amber-500" /> },
              { step: "03", title: "✅ Get help fast", desc: "Coordinate via secure in-app chat and resolve the need together.", icon: <CheckCircle2 className="w-10 h-10 text-emerald-500" /> }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-8 group">
                <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-white group-hover:shadow-2xl transition-all duration-500 border border-transparent group-hover:border-slate-100">
                  {item.icon}
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest border px-3 py-1 rounded-full">{item.step}</span>
                  <h3 className="text-2xl font-headline font-bold text-slate-900">{item.title}</h3>
                  <p className="text-slate-500 font-medium max-w-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section id="categories" className="py-32 bg-slate-50/50">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-6">
            <div className="space-y-4 max-w-xl text-center md:text-left">
               <h2 className="text-5xl font-headline font-bold tracking-tight text-slate-900">Support Channels</h2>
               <p className="text-xl text-slate-500 font-medium">Verified expertise for every neighborhood situation.</p>
            </div>
            <Link href="/auth/register">
              <Button variant="outline" className="rounded-full font-bold border-slate-200 px-8 h-12 shadow-sm bg-white">See all categories</Button>
            </Link>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                title: "Blood Donation", 
                icon: <Droplets className="w-8 h-8" />, 
                color: "bg-red-50 text-red-600 border-red-100", 
                desc: "Urgent units for surgeries or medical emergencies.",
                example: "Need 2 units O+ for patient at City Hosp."
              },
              { 
                title: "Academic Help", 
                icon: <BookOpen className="w-8 h-8" />, 
                color: "bg-blue-50 text-blue-600 border-blue-100", 
                desc: "Peer-to-peer tutoring and exam prep sessions.",
                example: "Struggling with Dijkstra's algorithm logic."
              },
              { 
                title: "Repair Service", 
                icon: <Wrench className="w-8 h-8" />, 
                color: "bg-amber-50 text-amber-600 border-amber-100", 
                desc: "Technical fix for electronics or personal gear.",
                example: "MacBook screen flickering since morning."
              },
              { 
                title: "Emergency", 
                icon: <AlertTriangle className="w-8 h-8" />, 
                color: "bg-rose-50 text-rose-600 border-rose-100", 
                desc: "Immediate help for lost items or urgent safety.",
                example: "Lost wallet near Library with campus ID."
              }
            ].map((cat, i) => (
              <Card key={i} className="group rounded-[2.5rem] border-none shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden bg-white">
                <CardContent className="p-10 space-y-6">
                  <div className={`w-16 h-16 ${cat.color} rounded-2xl flex items-center justify-center border shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                    {cat.icon}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-headline font-bold text-slate-900 leading-tight">{cat.title}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{cat.desc}</p>
                  </div>
                  <div className="pt-6 border-t border-slate-50">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Example Request</p>
                    <p className="text-xs font-bold text-slate-700 leading-snug italic">"{cat.example}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-32 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="container px-6 mx-auto">
           <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-10">
                 <h2 className="text-5xl md:text-6xl font-headline font-bold tracking-tighter leading-none text-slate-900">
                   Hear from our <span className="text-primary italic">Community.</span>
                 </h2>
                 <div className="space-y-8">
                   {[
                     { name: "Sarah J.", role: "Student Volunteer", text: "I've helped 4 neighbors with bike repairs this month. The reputation system makes it so rewarding to see my impact grow!", avatar: "12" },
                     { name: "Prof. Miller", role: "Faculty Member", text: "CampusConnect is essential for our safety. It fosters a culture of mutual support that standard university apps lack.", avatar: "15" },
                     { name: "Rohit K.", role: "Junior Developer", text: "Found a tutoring match for Data Structures in 10 minutes. The real-time notification system is absolute magic.", avatar: "18" }
                   ].map((t, i) => (
                     <div key={i} className="p-8 border-none rounded-[2rem] bg-slate-50/50 space-y-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                        </div>
                        <p className="text-lg text-slate-700 font-medium leading-relaxed italic">"{t.text}"</p>
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-slate-200 overflow-hidden shadow-sm border-2 border-white">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.avatar}`} alt="avatar" />
                           </div>
                           <div>
                              <p className="font-bold text-slate-900">{t.name}</p>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.role}</p>
                           </div>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
              
              <div className="bg-slate-900 p-12 md:p-20 rounded-[4rem] border border-white/10 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-700">
                    <Heart className="w-64 h-64 text-white" />
                 </div>
                 <div className="space-y-8 relative z-10">
                    <div className="bg-primary/20 w-20 h-20 rounded-3xl flex items-center justify-center mb-10 border border-primary/30">
                      <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-4xl md:text-5xl font-headline font-bold text-white leading-tight">Ready to make a campus impact?</h3>
                    <p className="text-xl text-slate-400 font-medium leading-relaxed">
                      Join thousands of campus members already using CampusConnect to stay safe, get expert help, and give back.
                    </p>
                    <div className="pt-6">
                      <Link href="/auth/register" className="inline-block">
                        <Button size="lg" className="h-16 px-12 text-xl bg-primary hover:bg-primary/90 text-white font-bold rounded-full shadow-2xl shadow-primary/40 active:scale-95 transition-all">
                          Create Your Profile
                        </Button>
                      </Link>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">No subscription fees • Verified Campus Emails Only</p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 py-24 border-t border-white/5">
        <div className="container px-6 mx-auto grid md:grid-cols-4 gap-16">
          <div className="space-y-8 col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-xl">
                <Heart className="text-primary w-6 h-6 fill-primary" />
              </div>
              <span className="text-2xl font-headline font-bold text-white tracking-tight">CampusConnect</span>
            </div>
            <p className="text-sm leading-relaxed font-medium">The hyperlocal platform for campus emergencies and skill exchange. Building safer university communities together through neighborhood action.</p>
            <div className="flex gap-4">
               {[1,2,3,4].map(i => (
                 <div key={i} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-all cursor-pointer group">
                    <Globe className="w-5 h-5 text-slate-600 group-hover:text-white" />
                 </div>
               ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Platform</h4>
            <ul className="space-y-5 text-sm font-bold">
              <li><Link href="#" className="hover:text-primary transition-colors">Safety Protocols</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Verification Process</Link></li>
              <li><Link href="/leaderboard" className="hover:text-primary transition-colors">Global Leaderboard</Link></li>
              <li><Link href="/blood-donors" className="hover:text-primary transition-colors">Blood Registry</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Support</h4>
            <ul className="space-y-5 text-sm font-bold">
              <li><Link href="#" className="hover:text-primary transition-colors">Member Guidelines</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Shield</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Report Abuse</Link></li>
            </ul>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Campus Newsletter</h4>
            <p className="text-xs leading-relaxed font-medium">Stay updated with neighborhood news and impact alerts.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Campus email" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs flex-grow focus:outline-none focus:ring-1 focus:ring-primary" />
              <Button size="sm" className="bg-primary rounded-xl h-9">Join</Button>
            </div>
          </div>
        </div>
        
        <div className="container px-6 mx-auto mt-24 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
            © 2024 CampusConnect. Built for a more helpful university neighborhood.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Verified Campus Project
          </div>
        </div>
      </footer>
    </div>
  );
}
