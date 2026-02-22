
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Heart, Shield, Zap, Users, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find((img) => img.id === "hero-community");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <Heart className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-headline font-bold text-secondary">CampusConnect</span>
        </div>
        <div className="hidden md:flex gap-8">
          <Link href="#features" className="text-sm font-medium hover:text-accent transition-colors">Features</Link>
          <Link href="#about" className="text-sm font-medium hover:text-accent transition-colors">About</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/auth/register">
            <Button className="bg-primary hover:bg-primary/90 text-white font-medium">Join Now</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-[#EBF4F0]">
        <div className="container px-4 z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-headline font-bold leading-tight text-slate-900">
              Your Campus, <span className="text-secondary">Connected.</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-lg">
              CampusConnect is the hyperlocal platform for emergencies and skill exchange. Get help when you need it, and offer your skills to those nearby.
            </p>
            <div className="flex gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white group">
                  Get Started <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-secondary text-secondary hover:bg-secondary/10">
                  How it Works
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative h-[500px] w-full hidden md:block rounded-2xl overflow-hidden shadow-2xl rotate-2">
            {heroImage && (
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="object-cover"
                data-ai-hint={heroImage.imageHint}
              />
            )}
          </div>
        </div>
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="container px-4 mx-auto text-center mb-16">
          <h2 className="text-4xl font-headline font-bold mb-4">Why CampusConnect?</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">Building a resilient, helpful community within your campus and surrounding city.</p>
        </div>
        <div className="container px-4 mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Zap className="w-8 h-8 text-primary" />,
              title: "Real-time Responses",
              desc: "Urgent requests are pushed to verified helpers instantly based on their location."
            },
            {
              icon: <Shield className="w-8 h-8 text-secondary" />,
              title: "Verified Community",
              desc: "Roles like Volunteer and Service Provider are verified to ensure trust and safety."
            },
            {
              icon: <Users className="w-8 h-8 text-accent" />,
              title: "Skill Exchange",
              desc: "Need a tutor? A bike repair? Or someone to help with groceries? It's all here."
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-2xl bg-background hover:shadow-lg transition-all border border-transparent hover:border-primary/20 group">
              <div className="mb-4 inline-block p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-headline font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container px-4 mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Heart className="text-primary w-6 h-6" />
            <span className="text-xl font-headline font-bold text-white">CampusConnect</span>
          </div>
          <div className="flex gap-8 text-sm">
            <Link href="#" className="hover:text-white">Privacy Policy</Link>
            <Link href="#" className="hover:text-white">Terms of Service</Link>
            <Link href="#" className="hover:text-white">Contact Us</Link>
          </div>
          <div className="text-sm">
            © 2024 CampusConnect. Built for safer campuses.
          </div>
        </div>
      </footer>
    </div>
  );
}
