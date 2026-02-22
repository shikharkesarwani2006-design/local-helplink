"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Send } from "lucide-react";
import { draftHelpRequest } from "@/ai/flows/draft-help-request";

export default function NewRequest() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    urgency: "normal",
  });
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const handleAIDraft = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Missing info",
        description: "Please enter a basic title and description first.",
      });
      return;
    }

    setIsDrafting(true);
    try {
      const result = await draftHelpRequest({
        initialTitle: formData.title,
        initialDescription: formData.description,
      });

      setFormData({
        title: result.improvedTitle,
        description: result.improvedDescription,
        category: result.suggestedCategory,
        urgency: result.suggestedUrgency,
      });

      toast({
        title: "AI Optimized!",
        description: "Your request has been refined for better visibility.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Drafting failed",
        description: "Could not use AI drafting right now.",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;

    setIsSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await addDoc(collection(db, "requests"), {
        ...formData,
        createdBy: user.uid,
        status: "open",
        acceptedBy: null,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
        location: { area: "Hyperlocal Area" },
        postedByName: user.displayName || user.email?.split('@')[0] || "Member",
      });

      toast({
        title: "Success",
        description: "Your help request is now live.",
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      <main className="container max-w-2xl px-6 mx-auto mt-12">
        <Card className="shadow-2xl border-none">
          <CardHeader className="bg-primary/10 rounded-t-xl border-b border-primary/20">
            <CardTitle className="text-2xl font-headline text-secondary flex items-center gap-2">
              <Send className="w-5 h-5" /> Post a Help Request
            </CardTitle>
            <CardDescription>Tell the community what you need help with. AI can help refine your post.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Help Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Need help moving boxes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description">Detailed Description</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-secondary gap-1 hover:bg-secondary/10"
                    onClick={handleAIDraft}
                    disabled={isDrafting}
                  >
                    {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                    Use AI Draft
                  </Button>
                </div>
                <Textarea
                  id="description"
                  placeholder="Provide more context..."
                  className="min-h-[150px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blood">Blood Donation</SelectItem>
                      <SelectItem value="tutor">Tutoring</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={formData.urgency}
                    onValueChange={(val: any) => setFormData({ ...formData, urgency: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Broadcast Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
