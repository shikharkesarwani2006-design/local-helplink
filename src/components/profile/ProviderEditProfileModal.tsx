
"use client";

import { useState } from "react";
import { doc } from "firebase/firestore";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2, X, Plus, Loader2, MapPin, User, Phone, Clock, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const PROVIDER_CATEGORIES = [
  { label: "🔧 Bike/Vehicle Repair", value: "repair" },
  { label: "💻 Laptop/Electronics Repair", value: "repair" },
  { label: "📚 Academic Tutoring", value: "tutor" },
  { label: "🏠 Home Repair/Plumbing", value: "repair" },
  { label: "✂️ Other Services", value: "other" }
];

const EXPERIENCE_OPTIONS = ["Less than 1 year", "1-3 years", "3+ years"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ProviderEditProfileModal({ profile }: { profile: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    bio: profile?.bio || "",
    phone: profile?.phone || "",
    serviceCategory: profile?.serviceCategory || "",
    experience: profile?.experience || "",
    serviceArea: profile?.serviceArea || "",
    skills: profile?.skills || [],
    availability: profile?.availability || [],
    workingHours: {
      from: profile?.workingHours?.from || "09:00",
      to: profile?.workingHours?.to || "18:00"
    },
    hourlyRate: profile?.hourlyRate || "",
  });
  const [skillInput, setSkillInput] = useState("");
  const db = useFirestore();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!db || !profile?.id) return;
    setLoading(true);
    
    try {
      const profileRef = doc(db, "users", profile.id);
      updateDocumentNonBlocking(profileRef, {
        name: formData.name,
        bio: formData.bio,
        phone: formData.phone,
        serviceCategory: formData.serviceCategory,
        experience: formData.experience,
        serviceArea: formData.serviceArea,
        skills: formData.skills,
        availability: formData.availability,
        workingHours: formData.workingHours,
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : null,
      });

      toast({
        title: "Business Profile Updated",
        description: "Your professional details have been saved.",
      });
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile details.",
      });
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (skillInput && !formData.skills.includes(skillInput)) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s: string) => s !== skill) });
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.includes(day)
        ? prev.availability.filter(d => d !== day)
        : [...prev.availability, day]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 px-6 rounded-2xl gap-2 font-bold border-white/20 hover:bg-white/10 text-white bg-white/5">
          <Settings2 className="w-4 h-4" /> Edit Business Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl font-bold">Refine Expert Profile</DialogTitle>
          <DialogDescription>
            Update your service details to attract more community jobs.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-primary" /> Display Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="font-bold flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" /> Contact Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-primary" /> Service Category
              </Label>
              <Select value={formData.serviceCategory} onValueChange={(val) => setFormData({ ...formData, serviceCategory: val })}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_CATEGORIES.map(cat => (
                    <SelectItem key={cat.label} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Experience Level</Label>
              <Select value={formData.experience} onValueChange={(val) => setFormData({ ...formData, experience: val })}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area" className="font-bold flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Service Area Radius
            </Label>
            <Input
              id="area"
              value={formData.serviceArea}
              onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
              className="h-11 rounded-xl"
              placeholder="e.g. Hostel Block A to Main Gate"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Availability Days</Label>
            <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-xl border">
              {DAYS.map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`edit-day-${day}`} 
                    checked={formData.availability.includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <Label htmlFor={`edit-day-${day}`} className="text-xs font-bold">{day}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary"/> Hours From</Label>
              <Input 
                type="time" 
                value={formData.workingHours.from}
                onChange={(e) => setFormData({ ...formData, workingHours: { ...formData.workingHours, from: e.target.value }})}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary"/> Hours To</Label>
              <Input 
                type="time" 
                value={formData.workingHours.to}
                onChange={(e) => setFormData({ ...formData, workingHours: { ...formData.workingHours, to: e.target.value }})}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Hourly Rate (₹)</Label>
            <Input 
              type="number"
              placeholder="per hour (leave blank if free)"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Expertise Keywords</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Puncture repair, Django..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                className="h-10 rounded-xl"
              />
              <Button type="button" size="icon" className="rounded-xl h-10 w-10" variant="secondary" onClick={addSkill}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {formData.skills.map((skill: string) => (
                <Badge key={skill} variant="secondary" className="gap-1 px-3 py-1 text-[10px] font-bold rounded-full">
                  {skill}
                  <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeSkill(skill)} />
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={loading} className="w-full h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Update Business Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
