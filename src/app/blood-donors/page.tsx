"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  query, 
  where, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Droplets, 
  Search, 
  Calendar, 
  MapPin, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Filter,
  Loader2,
  Heart
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export default function BloodRegistryPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [bloodFilter, setBloodFilter] = useState("all");
  const [registering, setRegistering] = useState(false);
  
  const [donorData, setDonorData] = useState({
    bloodGroup: "",
    lastDonationDate: ""
  });

  // 1. Fetch current user profile to check if they are a donor
  const profileRef = useMemoFirebase(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch all donors
  const donorsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"), where("isDonor", "==", true));
  }, [db]);
  const { data: rawDonors, isLoading: isDonorsLoading } = useCollection(donorsQuery);

  // 3. Fetch active critical blood requests for the banner
  const urgencyQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "requests"), 
      where("category", "==", "blood"),
      where("urgency", "==", "high"),
      where("status", "==", "open")
    );
  }, [db]);
  const { data: criticalRequests } = useCollection(urgencyQuery);

  const donors = useMemo(() => {
    if (!rawDonors) return [];
    return [...rawDonors]
      .filter(d => {
        const matchesSearch = d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             d.location?.area?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBlood = bloodFilter === "all" || d.bloodGroup === bloodFilter;
        return matchesSearch && matchesBlood;
      })
      .sort((a, b) => {
        // Show those with NO lastDonationDate first (or most recent)
        const dateA = a.lastDonationDate ? new Date(a.lastDonationDate).getTime() : 0;
        const dateB = b.lastDonationDate ? new Date(b.lastDonationDate).getTime() : 0;
        return dateA - dateB;
      });
  }, [rawDonors, searchQuery, bloodFilter]);

  const handleRegisterDonor = async () => {
    if (!db || !user?.uid || !donorData.bloodGroup) return;
    setRegistering(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        bloodGroup: donorData.bloodGroup,
        lastDonationDate: donorData.lastDonationDate || null,
        isDonor: true,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Donor Registered", description: "Thank you for joining the life-saving registry!" });
      setRegistering(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Registration failed" });
      setRegistering(false);
    }
  };

  const handleRequestDonation = (donor: any) => {
    const title = `Urgent Request for ${donor.bloodGroup} Blood`;
    const desc = `Direct request to ${donor.name} for blood donation at MMMUT campus. Area: ${donor.location?.area || 'Campus'}`;
    router.push(`/requests/new?cat=blood&urg=high&title=${encodeURIComponent(title)}&desc=${encodeURIComponent(desc)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* 🚨 URGENT BANNER */}
      {criticalRequests && criticalRequests.length > 0 && (
        <div className="bg-red-600 text-white py-4 px-6 animate-in slide-in-from-top duration-500 border-b border-red-700 shadow-lg">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl animate-pulse">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-80">Urgent Campus Alert</p>
                <p className="text-sm font-bold leading-tight">
                  {criticalRequests[0].bloodGroup || 'Blood'} donation needed at {criticalRequests[0].location?.area || 'MMMUT Campus'}!
                </p>
              </div>
            </div>
            <Button size="sm" className="bg-white text-red-600 hover:bg-red-50 font-bold rounded-full px-6" onClick={() => router.push(`/dashboard`)}>
              View Request
            </Button>
          </div>
        </div>
      )}

      <header className="bg-white border-b py-12 px-6">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-3 rounded-2xl text-red-600 shadow-sm border border-red-100">
                <Droplets className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-headline font-bold text-slate-900 tracking-tight">Blood Donor Registry</h1>
            </div>
            <p className="text-slate-500 font-medium">A life-saving database of campus volunteers ready to help during emergencies.</p>
          </div>

          <div className="flex items-center gap-4">
            {profile?.isDonor ? (
              <Badge className="h-12 px-6 rounded-2xl bg-emerald-50 text-emerald-600 border-emerald-100 border-2 font-bold flex gap-2">
                <CheckCircle2 className="w-5 h-5" /> Registered Donor
              </Badge>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="h-14 px-8 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-xl shadow-red-600/20 flex gap-2">
                    <Heart className="w-5 h-5" /> Become a Donor
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[2.5rem] p-8 max-w-md">
                  <DialogHeader className="text-center space-y-4">
                    <div className="bg-red-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto">
                      <Droplets className="w-10 h-10 text-red-600" />
                    </div>
                    <DialogTitle className="text-3xl font-headline font-bold">Register as Donor</DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium text-base">
                      By registering, your blood group and location will be visible to neighbors who need urgent blood.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-6">
                    <div className="space-y-2">
                      <Label className="font-bold">Your Blood Group</Label>
                      <Select onValueChange={(v) => setDonorData({...donorData, bloodGroup: v})}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Last Donation Date (Optional)</Label>
                      <Input 
                        type="date" 
                        className="h-12 rounded-xl"
                        value={donorData.lastDonationDate}
                        onChange={(e) => setDonorData({...donorData, lastDonationDate: e.target.value})}
                      />
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                        Note: It's recommended to wait 3 months between donations.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl"
                      disabled={!donorData.bloodGroup || registering}
                      onClick={handleRegisterDonor}
                    >
                      {registering ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Confirm Registration"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto py-12 px-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* SIDEBAR FILTERS */}
          <aside className="w-full lg:w-72 space-y-6 shrink-0">
            <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
              <div className="p-6 border-b bg-slate-50/50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" /> Filters
                </h3>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Search Donors</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Name or area..." 
                      className="pl-10 h-11 bg-slate-50 border-none rounded-xl text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Blood Group</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setBloodFilter("all")}
                      className={cn(
                        "h-10 rounded-xl font-bold text-xs border transition-all",
                        bloodFilter === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:border-slate-300"
                      )}
                    >
                      All
                    </button>
                    {BLOOD_GROUPS.map(bg => (
                      <button 
                        key={bg}
                        onClick={() => setBloodFilter(bg)}
                        className={cn(
                          "h-10 rounded-xl font-bold text-xs border transition-all",
                          bloodFilter === bg ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20" : "bg-white text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 bg-red-50 dark:bg-red-950/20 rounded-[2rem] border-2 border-dashed border-red-100 dark:border-red-900/30 space-y-3">
              <Heart className="w-6 h-6 text-red-600" />
              <h4 className="font-bold text-red-900 dark:text-red-400">Why register?</h4>
              <p className="text-xs text-red-900 dark:text-red-200 leading-relaxed font-semibold">
                Campus blood shortages happen often. By being on this list, you're a first responder for neighbors in critical need.
              </p>
            </div>
          </aside>

          {/* DONOR GRID */}
          <div className="flex-grow space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold text-slate-900">
                Available Donors ({donors.length})
              </h2>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Live Registry
              </div>
            </div>

            {isDonorsLoading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => <Card key={i} className="h-48 rounded-[2rem] animate-pulse bg-white border-none" />)}
              </div>
            ) : donors.length === 0 ? (
              <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <Droplets className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900">No matching donors found</h3>
                <p className="text-slate-500 max-w-xs mx-auto">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {donors.map((donor) => (
                  <Card key={donor.id} className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden group hover:shadow-xl transition-all duration-300">
                    <div className="p-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-14 w-14 ring-4 ring-slate-50 shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${donor.email}`} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{donor.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{donor.name}</h4>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                              <MapPin className="w-3.5 h-3.5" /> {donor.location?.area || "Campus Member"}
                            </div>
                          </div>
                        </div>
                        <div className="bg-red-50 text-red-600 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border border-red-100 shadow-inner">
                          {donor.bloodGroup}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Donated</p>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {donor.lastDonationDate ? format(new Date(donor.lastDonationDate), 'MMM dd, yyyy') : "First Timer"}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Availability</p>
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                            <Clock className="w-3.5 h-3.5" />
                            Ready to Help
                          </div>
                        </div>
                      </div>

                      <Button 
                        className="w-full h-12 rounded-2xl bg-slate-900 text-white font-bold text-sm gap-2 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                        onClick={() => handleRequestDonation(donor)}
                      >
                        <Droplets className="w-4 h-4 text-red-500" /> Request Donation
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
