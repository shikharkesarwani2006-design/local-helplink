
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { FileUp, Loader2, Star, Trophy, Wand2 } from "lucide-react";
import { extractUserSkills } from "@/ai/flows/extract-user-skills";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      // For scaffold, we simulate reading a resume description
      // In a real app, you'd convert file to Data URI
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUri = reader.result as string;
        const result = await extractUserSkills({ resumeDataUri: dataUri });
        
        if (auth.currentUser) {
          const newSkills = [...new Set([...(profile.skills || []), ...result.skills])];
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            skills: newSkills
          });
          setProfile({ ...profile, skills: newSkills });
          toast({
            title: "Skills Extracted!",
            description: `Found ${result.skills.length} new skills from your resume.`,
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Extraction failed",
        description: "Could not process the resume.",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="flex items-center justify-center h-[80vh]"><Loader2 className="animate-spin text-primary w-12 h-12" /></div></div>;

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      <main className="container max-w-4xl px-6 mx-auto mt-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Sidebar / Stats */}
          <Card className="md:col-span-1 shadow-lg h-fit">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email}`} />
                  <AvatarFallback>{profile?.name?.[0]}</AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="font-headline text-2xl">{profile?.name}</CardTitle>
              <p className="text-sm text-slate-500 capitalize">{profile?.role}</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="grid grid-cols-2 gap-4 py-4 border-t border-b">
                <div className="text-center">
                  <div className="flex items-center justify-center text-amber-500 font-bold gap-1">
                    <Star className="w-4 h-4 fill-amber-500" /> {profile?.rating || 5.0}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Rating</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-primary font-bold gap-1">
                    <Trophy className="w-4 h-4" /> {profile?.totalHelped || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Helped</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-slate-400">Contact</Label>
                <p className="text-sm">{profile?.email}</p>
                <p className="text-sm">{profile?.phone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Main Content / Skills */}
          <div className="md:col-span-2 space-y-6">
            <Card className="shadow-lg border-t-4 border-t-accent">
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="font-headline">Verified Skills</CardTitle>
                  <CardDescription>Your toolkit for helping the campus community.</CardDescription>
                </div>
                <div className="relative">
                  <Input 
                    type="file" 
                    id="resume" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx" 
                    onChange={handleResumeUpload}
                    disabled={isExtracting}
                  />
                  <Button asChild variant="outline" size="sm" className="gap-2 cursor-pointer border-accent text-accent hover:bg-accent/10">
                    <Label htmlFor="resume" className="flex items-center gap-2 cursor-pointer mb-0">
                      {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                      {isExtracting ? "Extracting..." : "Upload Resume"}
                    </Label>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {profile?.skills?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill: string, i: number) => (
                      <Badge key={i} variant="secondary" className="px-3 py-1 text-sm bg-accent/10 text-accent border-accent/20">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed">
                    <Wand2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No skills listed yet. Upload a resume to auto-detect them!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline">Help History</CardTitle>
                <CardDescription>Recent requests you've responded to.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                   <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-emerald-800">Chemistry Tutoring</h4>
                        <p className="text-xs text-emerald-600">Completed 3 days ago</p>
                      </div>
                      <Badge className="bg-emerald-500 text-white">Completed</Badge>
                   </div>
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
