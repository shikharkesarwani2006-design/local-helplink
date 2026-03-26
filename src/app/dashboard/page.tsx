
"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { UserDashboardView } from "@/components/dashboard/UserDashboardView";
import { VolunteerDashboardView } from "@/components/dashboard/VolunteerDashboardView";
import { ProviderDashboardView } from "@/components/dashboard/ProviderDashboardView";

function DashboardContent() {
  const { user, isUserLoading, authInitialized } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const profileRef = useMemoFirebase(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  useEffect(() => {
    if (profile?.role === "admin") {
      router.push("/admin");
    }
  }, [profile, router]);

  if (isUserLoading || isProfileLoading || !authInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Admin users are handled by the useEffect redirect
  if (profile?.role === "admin") return null;

  if (profile?.role === "volunteer") {
    return <VolunteerDashboardView profile={profile} user={user!} />;
  }

  if (profile?.role === "provider") {
    return <ProviderDashboardView profile={profile} user={user!} />;
  }

  return <UserDashboardView profile={profile} user={user!} />;
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
