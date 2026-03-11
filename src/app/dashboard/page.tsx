
"use client";

import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { UserDashboardView } from "@/components/dashboard/UserDashboardView";
import { VolunteerDashboardView } from "@/components/dashboard/VolunteerDashboardView";
import { ProviderDashboardView } from "@/components/dashboard/ProviderDashboardView";

export default function Dashboard() {
  const { user, isUserLoading, authInitialized } = useUser();
  const db = useFirestore();

  const profileRef = useMemoFirebase(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  if (isUserLoading || isProfileLoading || !authInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Route to the appropriate dashboard view based on role
  if (profile?.role === "volunteer") {
    return <VolunteerDashboardView profile={profile} user={user!} />;
  }

  if (profile?.role === "provider") {
    return <ProviderDashboardView profile={profile} user={user!} />;
  }

  return <UserDashboardView profile={profile} user={user!} />;
}
