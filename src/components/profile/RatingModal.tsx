
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
      // 1. Transactional Average Rating Update
      await runTransaction(db, async (transaction) => {
        const targetUserRef = doc(db, "users", toUser);
        const userDoc = await transaction.get(targetUserRef);
        
        if (!userDoc.exists()) {
          throw new Error("Target user profile not found");
        }

        const data = userDoc.data();
        const currentCount = data.totalRatingsCount || 0;
        const currentRating = data.rating || 5.0;
        
        // Calculate new average
        const newTotalScore = (currentRating * currentCount) + score;
        const newCount = currentCount + 1;
        const newAverage = newTotalScore / newCount;

        // Add the Rating Document to the global collection
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

        // Update User Profile with new stats
        transaction.update(targetUserRef, {
          rating: Number(newAverage.toFixed(2)),
          totalRatingsCount: newCount,
          // If this was a helper rating, increment their helped count too if not already done
          totalHelped: (data.totalHelped || 0) + 1
        });
      });

      // 2. Trigger notification
      sendNotification(db, toUser, {
        title: "Community Appreciation",
        message: `You received a ${score}-star review for your help!`,
        type: "rated",
        link: "/profile"
      });

      toast({
        title: "Feedback Shared!",
        description: "Your review helps keep our community safe and high-quality.",
      });
      setOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: error.message || "Could not save your rating.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-primary hover:bg-primary/10 font-bold gap-2 rounded-full border-primary">
          <Heart className="w-4 h-4 fill-primary" /> Rate Your Helper
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-8">
        <DialogHeader className="text-center space-y-3">
          <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-2">
            <Heart className="text-primary w-8 h-8 fill-primary" />
          </div>
          <DialogTitle className="font-headline text-3xl font-bold text-slate-900">Mission Feedback</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            How helpful was your neighbor? Your honest review builds a trusted campus network.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-8 py-8 text-center">
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className="transition-all hover:scale-125 active:scale-95 focus:outline-none"
              >
                <Star
                  className={`w-12 h-12 transition-colors ${
                    s <= score ? "text-amber-400 fill-amber-400" : "text-slate-100"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="space-y-3 text-left">
            <Label htmlFor="comment" className="font-bold text-slate-700">A short note (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Tell others what made this experience great..."
              className="min-h-[100px] rounded-2xl bg-slate-50 border-none resize-none"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="sm:flex-col gap-3">
          <Button 
            onClick={handleSubmitRating} 
            disabled={loading} 
            className="bg-primary hover:bg-primary/90 text-white w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Submit Review
          </Button>
          <Button variant="ghost" className="w-full font-bold text-slate-400 h-10" onClick={() => setOpen(false)}>
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
