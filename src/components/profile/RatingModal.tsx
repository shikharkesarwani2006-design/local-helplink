"use client";

import { useState } from "react";
import { collection, doc, Timestamp, runTransaction } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendNotification } from "@/firebase/notifications";

export function RatingModal({ requestId, toUser }: { requestId: string; toUser: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSubmitRating = async () => {
    if (!db || !user?.uid) return;
    setLoading(true);
    
    try {
      // 1. ATOMIC TRANSACTION: Update helper stats and record review
      await runTransaction(db, async (transaction) => {
        const targetUserRef = doc(db, "users", toUser);
        const userDoc = await transaction.get(targetUserRef);
        
        if (!userDoc.exists()) {
          throw new Error("Helper profile not found.");
        }

        const data = userDoc.data();
        const currentCount = data.totalRatingsCount || 0;
        const currentRating = data.rating || 5.0;
        
        // Calculate Weighted Average
        const newCount = currentCount + 1;
        const newAverage = ((currentRating * currentCount) + score) / newCount;

        // Record Rating Document
        const ratingsRef = collection(db, "ratings");
        const ratingDocRef = doc(ratingsRef);
        transaction.set(ratingDocRef, {
          requestId,
          fromUser: user.uid,
          toUser,
          score,
          comment,
          createdAt: Timestamp.now(),
        });

        // Update Target User Profile
        transaction.update(targetUserRef, {
          rating: Number(newAverage.toFixed(2)),
          totalRatingsCount: newCount,
          totalHelped: (data.totalHelped || 0) + 1
        });
      });

      // 2. Trigger System Notification
      sendNotification(db, toUser, {
        title: "Mission High-Five!",
        message: `A neighbor left you a ${score}-star review!`,
        type: "rated",
        link: "/profile"
      });

      toast({
        title: "Feedback Broadcasted!",
        description: "Your appreciation strengthens our campus community.",
      });
      setOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Rating Failed",
        description: error.message || "We couldn't save your review. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-primary hover:bg-primary/10 font-bold gap-2 rounded-full border-primary h-9 px-5">
          <Heart className="w-4 h-4 fill-primary" /> Rate Neighbor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-8">
        <DialogHeader className="text-center space-y-4">
          <div className="bg-primary/10 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto transition-transform hover:scale-110">
            <Heart className="text-primary w-10 h-10 fill-primary" />
          </div>
          <DialogTitle className="font-headline text-3xl font-bold text-slate-900">Mission Success!</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            How was your experience? Your feedback ensures a trusted neighborhood network for everyone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-8 py-8 text-center">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScore(s)}
                className="transition-all hover:scale-125 active:scale-95 focus:outline-none p-1"
              >
                <Star
                  className={`w-12 h-12 transition-colors ${
                    s <= score ? "text-amber-400 fill-amber-400" : "text-slate-100 dark:text-slate-800"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="space-y-3 text-left">
            <Label htmlFor="comment" className="font-bold text-slate-700 ml-1">Write a short appreciation</Label>
            <Textarea
              id="comment"
              placeholder="e.g., Quick response and very professional repair!"
              className="min-h-[100px] rounded-2xl bg-slate-50 dark:bg-slate-800 border-none resize-none focus-visible:ring-primary/20"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="sm:flex-col gap-3">
          <Button 
            onClick={handleSubmitRating} 
            disabled={loading} 
            className="bg-primary hover:bg-primary/90 text-white w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Submit Appreciation
          </Button>
          <Button variant="ghost" className="w-full font-bold text-slate-400 h-10 rounded-xl" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
