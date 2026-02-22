
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Heart, Shield, Zap, Users, ArrowRight, CheckCircle2, MessageSquare, Globe, Star } from "lucide-react";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find((img) => img.id === "hero-community");
  const [counts, setCounts] = useState({ resolved: 0, users: 0, time: 0 });

  useEffect(() => {
    // Simple animated counter effect
    const interval = setInterval(() => {
      setCounts(prev => ({
        resolved: prev.resolved < 1250 ? prev.resolved + 13 : 1250,
        users: prev.users < 840 ? prev.users + 9 : 840,
        time: prev.time < 12 ? prev.time + 1 : 12,
      }));
    }, 20);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-xl">
            <Heart className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-headline font-bold text-slate-900">Local HelpLink</span>
        </div>
        <div className="hidden md:flex gap-8">
          <Link href="#how-it-works" className="text-sm font-semibold hover:text-primary transition-colors">How it Works</Link>
          <Link href="#categories" className="text-sm font-semibold hover:text-primary transition-colors">Categories</Link>
          <Link href="#impact" className="text-sm font-semibold hover:text-primary transition-colors">Impact</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login">
            <Button variant="ghost" className="font-bold">Login</Button>
          </Link>
          <Link href="/auth/register">
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-full px-6">Join Now</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-white">
        <div className="container px-6 mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-primary text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3 h-3" /> Hyperlocal Help Network
            </div>
            <h1 className="text-6xl md:text-8xl font-headline font-bold leading-tight text-slate-900 tracking-tighter">
              Get Help. Give Help. <span className="text-primary">Instantly.</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-lg leading-relaxed">
              Connect with your immediate neighborhood for emergency help and skill exchange. Your campus network, strengthened by community action.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/auth/register">
                <Button size="lg" className="h-16 px-10 text-xl bg-primary hover:bg-primary/90 text-white font-bold rounded-full shadow-2xl shadow-primary/30 group">
                  Join Your Campus <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <div className="flex items-center gap-4 px-6 border rounded-full bg-white shadow-sm">
                 <div className="flex -space-x-3">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                     </div>
                   ))}
                 </div>
                 <div className="text-sm font-bold text-slate-500">+800 Joined</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="relative h-[600px] w-full rounded-[2.5rem] overflow-hidden shadow-2xl rotate-2 border-8 border-white">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  fill
                  className="object-cover"
                  data-ai-hint={heroImage.imageHint}
                />
              )}
              <div className="absolute bottom-8 left-8 right-8 glass-card p-6 rounded-2xl animate-in slide-in-from-bottom-10 duration-700">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500 p-2 rounded-full"><CheckCircle2 className="text-white w-6 h-6" /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Request Resolved</p>
                    <p className="text-xs text-slate-500 font-medium">"Found a physics tutor in 12 minutes!"</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Counter */}
      <section id="impact" className="py-20 bg-slate-900 text-white overflow-hidden">
        <div className="container px-6 mx-auto grid md:grid-cols-3 gap-12 text-center">
          <div className="space-y-2">
            <h3 className="text-6xl font-headline font-bold text-indigo-400">{counts.resolved}+</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Requests Resolved</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-6xl font-headline font-bold text-indigo-400">{counts.users}+</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Verified Members</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-6xl font-headline font-bold text-indigo-400">{counts.time}m</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Avg Response Time</p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-32 bg-white">
        <div className="container px-6 mx-auto">
          <div className="text-center mb-24 max-w-3xl mx-auto space-y-4">
            <h2 className="text-5xl font-headline font-bold text-slate-900 tracking-tight">The 3-Step Match</h2>
            <p className="text-xl text-slate-500">How we turn community needs into neighborhood action.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-16 relative">
             {/* Connector line for desktop */}
            <div className="hidden md:block absolute top-1/3 left-0 w-full h-px bg-slate-100 -z-10" />
            
            {[
              { step: "01", title: "Post a Need", desc: "Broadcast your emergency or skill request to people nearby.", icon: <MessageSquare className="w-10 h-10 text-indigo-600" /> },
              { step: "02", title: "Quick Match", desc: "Our real-time feed notifies verified volunteers instantly.", icon: <Zap className="w-10 h-10 text-amber-500" /> },
              { step: "03", title: "Action", desc: "Coordinate safely via in-app chat and resolve the need.", icon: <CheckCircle2 className="w-10 h-10 text-emerald-500" /> }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-6 group">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:bg-white group-hover:shadow-xl transition-all duration-300">
                  {item.icon}
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-black text-primary/30 font-mono tracking-tighter">{item.step}</span>
                  <h3 className="text-2xl font-headline font-bold">{item.title}</h3>
                  <p className="text-slate-500 max-w-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Cards */}
      <section id="categories" className="py-32 bg-slate-50">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div className="space-y-4">
               <h2 className="text-5xl font-headline font-bold tracking-tight">Support Channels</h2>
               <p className="text-xl text-slate-500">Specific categories for targeted help.</p>
            </div>
            <Link href="/auth/register">
              <Button variant="outline" className="rounded-full font-bold border-slate-200">See all categories</Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Blood Donation", icon: "🩸", color: "bg-red-50 text-red-600", count: "14 Open" },
              { title: "Academic Help", icon: "📚", color: "bg-blue-50 text-blue-600", count: "42 Open" },
              { title: "Repair Service", icon: "🔧", color: "bg-amber-50 text-amber-600", count: "28 Open" },
              { title: "Emergency", icon: "🚨", color: "bg-rose-50 text-rose-600", count: "5 Critical" }
            ].map((cat, i) => (
              <div key={i} className="p-8 bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-indigo-100 group">
                <div className={`w-14 h-14 ${cat.color} rounded-2xl flex items-center justify-center text-2xl mb-6`}>{cat.icon}</div>
                <h3 className="text-xl font-bold mb-1">{cat.title}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{cat.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-white">
        <div className="container px-6 mx-auto">
           <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                 <h2 className="text-5xl font-headline font-bold tracking-tight leading-none">Hear from our <span className="text-primary">Community.</span></h2>
                 <div className="space-y-6">
                   {[
                     { name: "Sarah J.", role: "Student Helper", text: "I've helped 4 neighbors with bike repairs this month. The reputation system makes it so rewarding!", avatar: "1" },
                     { name: "Prof. Miller", role: "Faculty", text: "Local HelpLink is essential for campus safety and fostering a culture of mutual support." , avatar: "2" }
                   ].map((t, i) => (
                     <div key={i} className="p-8 border rounded-3xl bg-slate-50/50 space-y-4">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                        </div>
                        <p className="text-lg text-slate-700 italic">"{t.text}"</p>
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.avatar}`} alt="avatar" />
                           </div>
                           <div>
                              <p className="text-sm font-bold">{t.name}</p>
                              <p className="text-xs text-slate-500 font-medium">{t.role}</p>
                           </div>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
              <div className="bg-primary/5 p-12 rounded-[3rem] border border-primary/10 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Heart className="w-40 h-40 text-primary" />
                 </div>
                 <div className="space-y-6 relative z-10">
                    <h3 className="text-4xl font-headline font-bold">Ready to make an impact?</h3>
                    <p className="text-lg text-slate-600">Join the thousands of campus members already using Local HelpLink to stay safe and connected.</p>
                    <Link href="/auth/register" className="inline-block">
                      <Button size="lg" className="h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-white font-bold rounded-full">
                        Create Your Profile
                      </Button>
                    </Link>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-20 border-t border-white/10">
        <div className="container px-6 mx-auto grid md:grid-cols-4 gap-12">
          <div className="space-y-6 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <Heart className="text-primary w-6 h-6" />
              <span className="text-2xl font-headline font-bold text-white">Local HelpLink</span>
            </div>
            <p className="text-sm leading-relaxed">The hyperlocal platform for emergencies and skill exchange. Building safer communities together.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="#" className="hover:text-primary transition-colors">Safety Features</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Verification Process</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Leaderboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Support</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Contact Support</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Connect</h4>
            <div className="flex gap-4">
               {[1,2,3].map(i => (
                 <div key={i} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                    <Globe className="w-5 h-5" />
                 </div>
               ))}
            </div>
          </div>
        </div>
        <div className="container px-6 mx-auto mt-20 pt-10 border-t border-white/5 text-center text-xs font-medium uppercase tracking-widest text-slate-500">
          © 2024 Local HelpLink. Built for a more helpful neighborhood.
        </div>
      </footer>
    </div>
  );
}
