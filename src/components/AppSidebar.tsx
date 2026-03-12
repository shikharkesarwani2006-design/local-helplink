
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
  Shield,
  Search,
  CheckCircle2,
  Briefcase,
  Zap,
  Star,
  BarChart3,
  Circle
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
import { useUser, useDoc, useMemoFirebase, useAuth, useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
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

  const mainLinks = useMemo(() => {
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
        { label: "Available Jobs", href: "/dashboard?tab=incoming", icon: Zap },
        { label: "Active Jobs", href: "/dashboard?tab=active", icon: Briefcase },
        { label: "Job History", href: "/profile?tab=helped", icon: History },
      ];
    }

    // Default Regular User Links
    return [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Post Request", href: "/requests/new", icon: PlusCircle },
      { label: "My Requests", href: "/requests/my", icon: History },
    ];
  }, [profile?.role]);

  const businessLinks = useMemo(() => {
    if (profile?.role !== 'provider') return [];
    return [
      { label: "My Profile", href: "/profile", icon: User },
      { label: "My Reviews", href: "/profile?tab=reviews", icon: Star },
      { label: "Earnings Tracker", href: "#", icon: BarChart3 },
    ];
  }, [profile?.role]);

  const personalLinks = useMemo(() => {
    if (profile?.role === 'provider') return []; // Providers use businessLinks instead
    return [
      { label: "My Profile", href: "/profile", icon: User },
      { label: "Leaderboard", href: "#", icon: Trophy },
    ];
  }, [profile?.role]);

  const handleToggleAvailability = (checked: boolean) => {
    if (!db || !user?.uid) return;
    updateDocumentNonBlocking(doc(db, "users", user.uid), { isAvailable: checked });
  };

  // Early return must happen AFTER all hooks are called
  if (!user || pathname === "/" || pathname.startsWith("/auth")) return null;

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

  const handleLinkClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 dark:border-slate-800/50" role="navigation" aria-label="Sidebar Navigation">
      <SidebarHeader className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 mb-8 group-data-[collapsible=icon]:mb-0" aria-label="Local HelpLink Home">
          <div className="bg-primary p-2 rounded-xl shrink-0 shadow-lg shadow-primary/20">
            <Heart className="text-white w-5 h-5 fill-white" />
          </div>
          <span className="font-headline font-bold text-xl tracking-tight text-white group-data-[collapsible=icon]:hidden">
            HelpLink
          </span>
        </Link>

        {/* Profile Card Area */}
        <div className="flex flex-col gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none overflow-hidden transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10 ring-2 ring-white/10">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
                <AvatarFallback className="bg-primary text-white font-bold">{profile?.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              {profile?.verified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 ring-2 ring-sidebar">
                  <ShieldCheck className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-bold text-white truncate">{profile?.name || "Member"}</span>
              <Badge variant="outline" className="w-fit text-[9px] font-black uppercase h-4 px-1.5 mt-0.5 bg-primary/20 border-primary/30 text-primary-foreground">
                {profile?.role === 'provider' ? (profile?.serviceCategory || 'Provider') : (profile?.role || "user")}
              </Badge>
            </div>
          </div>

          {/* Availability Toggle for Providers */}
          {profile?.role === 'provider' && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  profile.isAvailable ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-red-500"
                )} />
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                  {profile.isAvailable ? 'Available' : 'Busy'}
                </span>
              </div>
              <Switch 
                checked={profile.isAvailable || false}
                onCheckedChange={handleToggleAvailability}
                className="data-[state=checked]:bg-emerald-500 scale-75"
              />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 gap-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 px-3 mb-2 group-data-[collapsible=icon]:hidden">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainLinks.map((item) => (
                <SidebarMenuItem key={item.label + item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    onClick={handleLinkClick}
                    className={cn(
                      "h-11 px-3 rounded-xl transition-all duration-200",
                      pathname === item.href 
                        ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className={cn("w-5 h-5", pathname === item.href ? "text-white" : "text-white/40")} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Business Section for Providers */}
        {profile?.role === 'provider' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 px-3 mb-2 group-data-[collapsible=icon]:hidden">
              Business
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {businessLinks.map((item) => (
                  <SidebarMenuItem key={item.label + item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === item.href}
                      tooltip={item.label}
                      onClick={handleLinkClick}
                      className={cn(
                        "h-11 px-3 rounded-xl transition-all duration-200",
                        pathname === item.href 
                          ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" 
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("w-5 h-5", pathname === item.href ? "text-white" : "text-white/40")} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 px-3 mb-2 group-data-[collapsible=icon]:hidden">
            {profile?.role === 'volunteer' ? 'Community' : profile?.role === 'provider' ? 'Settings' : 'Personal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {personalLinks.map((item) => (
                <SidebarMenuItem key={item.label + item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    onClick={handleLinkClick}
                    className={cn(
                      "h-11 px-3 rounded-xl transition-all duration-200",
                      pathname === item.href 
                        ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className={cn("w-5 h-5", pathname === item.href ? "text-white" : "text-white/40")} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {profile?.role === 'admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/admin'}
                    tooltip="Admin Oversight"
                    onClick={handleLinkClick}
                    className={cn(
                      "h-11 px-3 rounded-xl transition-all duration-200",
                      pathname === '/admin' 
                        ? "bg-amber-500 text-white font-bold shadow-lg shadow-amber-500/20" 
                        : "text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/5"
                    )}
                  >
                    <Link href="/admin">
                      <Shield className={cn("w-5 h-5", pathname === '/admin' ? "text-white" : "text-amber-500/40")} />
                      <span>Admin Oversight</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              tooltip="Log Out"
              className="rounded-xl h-11 px-3 text-red-400 font-bold hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
