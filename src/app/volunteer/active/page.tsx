
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Clock, Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * Placeholder view for the Active Missions page during development.
 */
export default function MyActiveMissionsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20">
      <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-10 px-6">
        <div className="container max-w-5xl mx-auto space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
              <Clock className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-headline font-bold text-slate-900 dark:text-white tracking-tight">Active Missions</h1>
          </div>
          <p className="text-slate-500 font-medium">Real-time neighborhood mission control.</p>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto py-20 px-6">
        <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Construction className="w-64 h-64" />
          </div>
          <CardContent className="p-16 text-center space-y-8 relative z-10">
            <div className="bg-primary/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-headline font-bold text-slate-900 dark:text-white tracking-tight">
                Mission Command <span className="text-primary">Coming Soon</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
                We're engineering a state-of-the-art dashboard for your active missions, featuring live location tracking, instant chat coordination, and impact proofing.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="px-6 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-black uppercase tracking-widest border border-slate-200/50 dark:border-slate-700">
                Phase 2 Deployment
              </div>
              <Button 
                variant="ghost" 
                className="rounded-full font-bold gap-2 text-primary"
                onClick={() => router.push('/volunteer/missions')}
              >
                <ArrowLeft className="w-4 h-4" /> Back to Browse
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
