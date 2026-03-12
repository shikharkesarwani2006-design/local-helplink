
"use client";

import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  User, 
  ShieldCheck, 
  LogOut,
  Heart,
  Trophy,
  Search,
  CheckCircle2,
  Briefcase,
  Zap,
  Star,
  BarChart3,
  Users,
  LayoutGrid,
  Megaphone,
  Wrench,
  AlertTriangle,
  LineChart,
  CircleDollarSign
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar
} from "@/components/ui/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useDoc, useMemoFirebase, useAuth, useFirestore, updateDocumentNonBlocking, useCollection } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { auth } = useAuth();
  const db = useFirestore();
  const { isMobile, setOpenMobile } = useSidebar();

  const userRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(userRef);

  const isAdmin = profile?.role === 'admin';

  // REMOVED orderBy
  const pendingQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collection(db, "users"), where("role", "==", "provider"));
  }, [db, isAdmin]);
  const { data: rawProviders } = useCollection(pendingQuery);

  const pendingCount = useMemo(() => rawProviders?.filter(u => u.verified === false).length || 0, [rawProviders]);

  const reportedQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collection(db, "requests"), where("reported", "==", true));
  }, [db, isAdmin]);
  const { data: reportedRequests } = useCollection(reportedQuery);

  const allUsersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collection(db, "users"));
  }, [db, isAdmin]);
  const { data: allUsers } = useCollection(allUsersQuery);

  const openRequestsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collection(db, "requests"), where("status", "==", "open"));
  }, [db, isAdmin]);
  const { data: openRequests } = useCollection(openRequestsQuery);

  const mainLinks = useMemo(() => {
    if (isAdmin) {
      return [
        { label: "Overview", href: "/admin", icon: LayoutDashboard },
        { label: "Citizen Directory", href: "/admin/users", icon: Users },
        { label: "All Requests", href: "/admin/requests", icon: LayoutGrid },
        { label: "Pending Verifications", href: "/admin/verifications", icon: ShieldCheck, badge: pendingCount },
        { label: "Provider Monitor", href: "/admin/providers", icon: Wrench },
      ];
    }

    if (profile?.role === 'volunteer') {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Browse Missions", href: "/volunteer/missions", icon: Search },
        { label: "My Active Missions", href: "/volunteer/active", icon: CheckCircle2 },
        { label: "Mission History", href: "/volunteer/history", icon: History },
      ];
    }
    
    if (profile?.role === 'provider') {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Available Jobs", href: "/provider/jobs", icon: Zap },
        { label: "Active Jobs", href: "/dashboard?tab=active", icon: Briefcase },
        { label: "Job History", href: "/provider/profile?tab=overview", icon: History },
      ];
    }

    return [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Post Request", href: "/requests/new", icon: PlusCircle },
      { label: "My Requests", href: "/requests/my", icon: History },
    ];
  }, [profile?.role, pendingCount, isAdmin]);

  const analyticsLinks = useMemo(() => {
    if (!isAdmin) return [];
    return [
      { label: "Platform Analytics", href: "/admin", icon: LineChart },
      { label: "Earnings Overview", href: "/admin/providers", icon: CircleDollarSign },
    ];
  }, [isAdmin]);

  const moderationLinks = useMemo(() => {
    if (isAdmin) {
      return [
        { label: "Reported Content", href: "/admin/requests", icon: AlertTriangle, badge: reportedRequests?.length, badgeColor: "bg-red-500" },
        { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
      ];
    }
    return [];
  }, [isAdmin, reportedRequests?.length]);

  const profileLinks = useMemo(() => {
    if (isAdmin) return [];
    if (profile?.role === 'provider') {
      return [
        { label: "My Profile", href: "/provider/profile", icon: User },
        { label: "My Reviews", href: "/provider/profile?tab=reviews", icon: Star },
        { label: "Earnings Tracker", href: "/provider/profile?tab=earnings", icon: BarChart3 },
      ];
    }
    return [
      { label: "My Profile", href: "/profile", icon: User },
      { label: "Leaderboard", href: "#", icon: Trophy },
    ];
  }, [profile?.role, isAdmin]);

  const handleToggleAvailability = (checked: boolean) => {
    if (!db || !user?.uid) return;
    updateDocumentNonBlocking(doc(db, "users", user.uid), { isAvailable: checked });
  };

  const handleLogout = async () => {
    try {
      if (!auth) return;
      await signOut(auth);
      router.push("/");
      if (isMobile) setOpenMobile(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!user || pathname === "/" || pathname.startsWith("/auth")) return null;

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 dark:border-slate-800/50">
      <SidebarHeader className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 mb-8 group-data-[collapsible=icon]:mb-0">
          <div className="bg-primary p-2 rounded-xl shrink-0 shadow-lg shadow-primary/20"><Heart className="text-white w-5 h-5 fill-white" /></div>
          <span className="font-headline font-bold text-xl tracking-tight text-white group-data-[collapsible=icon]:hidden">HelpLink</span>
        </Link>
        <div className="flex flex-col gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none overflow-hidden transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10 ring-2 ring-white/10"><AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} /><AvatarFallback className="bg-primary text-white font-bold">{profile?.name?.[0] || '?'}</AvatarFallback></Avatar>
              {profile?.verified && <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 ring-2 ring-sidebar"><ShieldCheck className="w-2.5 h-2.5" /></div>}
            </div>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden"><span className="text-sm font-bold text-white truncate">{profile?.name || "Member"}</span><Badge variant="outline" className={cn("w-fit text-[9px] font-black uppercase h-4 px-1.5 mt-0.5 border-none", isAdmin ? "bg-red-500 text-white" : "bg-primary/20 text-primary-foreground")}>{isAdmin ? "ADMIN" : profile?.role || "USER"}</Badge></div>
          </div>
          {profile?.role === 'provider' && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-2"><div className={cn("w-2 h-2 rounded-full", profile.isAvailable ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-red-500")} /><span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{profile.isAvailable ? 'Available' : 'Busy'}</span></div>
              <Switch checked={profile.isAvailable || false} onCheckedChange={handleToggleAvailability} className="data-[state=checked]:bg-emerald-500 scale-75" />
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 gap-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 px-3 mb-2 group-data-[collapsible=icon]:hidden">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainLinks.map((item) => (
                <SidebarMenuItem key={item.label}><SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} className={cn("h-11 px-3 rounded-xl transition-all duration-200", pathname === item.href ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" : "text-white/60 hover:text-white hover:bg-white/5")}><Link href={item.href}><item.icon className={cn("w-5 h-5", pathname === item.href ? "text-white" : "text-white/40")} /><span>{item.label}</span>{item.badge !== undefined && item.badge > 0 && <span className="ml-auto bg-destructive text-[10px] text-white px-1.5 rounded-full font-black">{item.badge}</span>}</Link></SidebarMenuButton></SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {analyticsLinks.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 px-3 mb-2 group-data-[collapsible=icon]:hidden">Analytics</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {analyticsLinks.map((item) => (
                  <SidebarMenuItem key={item.label}><SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} className={cn("h-11 px-3 rounded-xl transition-all duration-200", pathname === item.href ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" : "text-white/60 hover:text-white hover:bg-white/5")}><Link href={item.href}><item.icon className={cn("w-5 h-5", pathname === item.href ? "text-white" : "text-white/40")} /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 px-3 mb-2 group-data-[collapsible=icon]:hidden">{isAdmin ? 'Moderation' : profile?.role === 'provider' ? 'Business' : 'Community'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {moderationLinks.map((item) => (
                <SidebarMenuItem key={item.label}><SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} className={cn("h-11 px-3 rounded-xl transition-all duration-200", pathname === item.href ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" : "text-white/60 hover:text-white hover:bg-white/5")}><Link href={item.href}><item.icon className={cn("w-5 h-5", pathname === item.href ? "text-white" : "text-white/40")} /><span>{item.label}</span>{item.badge !== undefined && item.badge > 0 && <span className={cn("ml-auto text-[10px] text-white px-1.5 rounded-full font-black", item.badgeColor || "bg-primary")}>{item.badge}</span>}</Link></SidebarMenuButton></SidebarMenuItem>
              ))}
              {profileLinks.map((item) => (
                <SidebarMenuItem key={item.label}><SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} className={cn("h-11 px-3 rounded-xl transition-all duration-200", pathname === item.href ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" : "text-white/60 hover:text-white hover:bg-white/5")}><Link href={item.href}><item.icon className={cn("w-5 h-5", pathname === item.href ? "text-white" : "text-white/40")} /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-white/5 space-y-4">
        {isAdmin && (
          <div className="px-3 py-2 bg-white/5 rounded-xl border border-white/5 group-data-[collapsible=icon]:hidden">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/40"><div className="flex items-center gap-1.5"><Users className="w-3 h-3" /> Citizens</div><span className="text-white">{allUsers?.length || 0}</span></div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/40"><div className="flex items-center gap-1.5"><LayoutGrid className="w-3 h-3" /> Open Requests</div><span className="text-primary">{openRequests?.length || 0}</span></div>
            </div>
          </div>
        )}
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={handleLogout} tooltip="Sign Out" className="rounded-xl h-11 px-3 text-red-400 font-bold hover:bg-red-500/10 hover:text-red-300 transition-colors"><LogOut className="w-5 h-5" /><span>Sign Out</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
