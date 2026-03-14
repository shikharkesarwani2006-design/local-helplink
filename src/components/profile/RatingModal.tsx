
"use client";

import { useState } from "react";
import { collection, doc, Timestamp, runTransaction, getDocs, query, where } from "firebase/firestore";
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
import { Star, Loader2, Heart, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendNotification } from "@/firebase/notifications";

export function RatingModal({ requestId, toUser, onClose }: { requestId: string; toUser: string; onClose?: () => void }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose();
  };

  const handleSubmitRating = async () => {
    if (!db || !user?.uid) return;
    setLoading(true);
    
    try {
      await runTransaction(db, async (transaction) => {
        const targetUserRef = doc(db, "users", toUser);
        const userDoc = await transaction.get(targetUserRef);
        
        if (!userDoc.exists()) {
          throw new Error("Helper profile not found.");
        }

        const ratingsRef = collection(db, "ratings");
        const q = query(ratingsRef, where("toUser", "==", toUser));
        const ratingsSnap = await getDocs(q);
        
        let totalScore = score;
        let count = 1;
        
        ratingsSnap.docs.forEach(d => {
          totalScore += d.data().score;
          count++;
        });

        const newAverage = totalScore / count;

        const ratingDocRef = doc(ratingsRef);
        transaction.set(ratingDocRef, {
          requestId,
          fromUser: user.uid,
          toUser,
          score,
          comment,
          createdAt: Timestamp.now(),
        });

        transaction.update(targetUserRef, {
          rating: Number(newAverage.toFixed(2)),
          totalRatingsCount: count
        });
      });

      await sendNotification(db, toUser, {
        title: "New Rating Received! ⭐",
        message: `A neighbor left you a ${score}-star review!`,
        type: "rated",
        link: "/profile"
      });

      toast({ title: "Rating submitted! ⭐", description: "Your appreciation strengthens our community." });
      handleClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Rating Failed", description: error.message || "Could not save review." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      {!onClose && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="text-primary hover:bg-primary/10 font-bold gap-2 rounded-full border-primary h-9 px-5">
            <Heart className="w-4 h-4 fill-primary" /> Rate Neighbor
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-8 border-none shadow-2xl">
        <DialogHeader className="text-center space-y-4">
          <div className="bg-emerald-100 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto transition-transform hover:scale-110">
            <Sparkles className="text-emerald-600 w-10 h-10" />
          </div>
          <DialogTitle className="font-headline text-3xl font-bold text-slate-900">Rate your helper!</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Your feedback ensures a trusted neighborhood network for everyone.
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
                  className={cn(
                    "w-12 h-12 transition-colors",
                    s <= score ? "text-amber-400 fill-amber-400" : "text-slate-100 dark:text-slate-800"
                  )}
                />
              </button>
            ))}
          </div>
          <div className="space-y-3 text-left">
            <Label htmlFor="comment" className="font-bold text-slate-700 ml-1">Write a short appreciation</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              className="min-h-[100px] rounded-2xl bg-slate-50 dark:bg-slate-800 border-none resize-none focus-visible:ring-primary/20"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col gap-3">
          <Button 
            onClick={handleSubmitRating} 
            disabled={loading} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Submit Rating
          </Button>
          <button className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors" onClick={handleClose}>
            Skip for now
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
