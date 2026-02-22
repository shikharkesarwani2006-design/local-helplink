
"use client";

import { useState } from "react";
import { collection, addDoc, doc, Timestamp, runTransaction } from "firebase/firestore";
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
          throw "User does not exist!";
        }

        const data = userDoc.data();
        const currentCount = data.totalRatingsCount || 0;
        const currentRating = data.rating || 5.0;
        const newRating = ((currentRating * currentCount) + score) / (currentCount + 1);

        // Add the Rating Document
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

        // Update User Profile
        transaction.update(targetUserRef, {
          rating: newRating,
          totalRatingsCount: currentCount + 1,
          totalHelped: (data.totalHelped || 0) + 1
        });
      });

      // 2. Client-side notification trigger
      sendNotification(db, toUser, {
        title: "New Rating Received",
        message: `You received a ${score}-star rating for your help.`,
        type: "rated",
        link: "/profile"
      });

      toast({
        title: "Feedback Shared!",
        description: "Thank you for helping keep our community quality high.",
      });
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit rating.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10 font-bold gap-1">
          <Heart className="w-4 h-4" /> Rate Helper
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="text-center">
          <DialogTitle className="font-headline text-2xl">Share the Love</DialogTitle>
          <DialogDescription>
            How was your experience with this neighbor?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-6 text-center">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className="transition-transform hover:scale-125 focus:outline-none"
              >
                <Star
                  className={`w-10 h-10 ${
                    s <= score ? "text-amber-400 fill-amber-400" : "text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="comment">Optional Comment</Label>
            <Textarea
              id="comment"
              placeholder="What made this experience great?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmitRating} disabled={loading} className="bg-primary hover:bg-primary/90 text-white w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
