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
import { Settings2, X, Plus, Loader2, MapPin, User, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function EditProfileModal({ profile }: { profile: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    bio: profile?.bio || "",
    phone: profile?.phone || "",
    area: profile?.location?.area || "",
    skills: profile?.skills || [],
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
        location: {
          ...profile?.location,
          area: formData.area
        },
        skills: formData.skills,
      });

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved to the campus network.",
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 px-6 rounded-2xl gap-2 font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Settings2 className="w-4 h-4" /> Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl font-bold">Refine Profile</DialogTitle>
          <DialogDescription>
            Keep your info updated to help neighbors coordinate better.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-bold flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" /> Full Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="font-bold flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" /> Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area" className="font-bold flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Primary Area
              </Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="Hostel Block A..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio" className="font-bold">Bio</Label>
            <Textarea
              id="bio"
              className="min-h-[80px] rounded-xl resize-none"
              placeholder="Tell others how you can help..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Managed Skills</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add skill..."
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
            Save Profile Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
