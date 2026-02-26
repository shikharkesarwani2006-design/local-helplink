
"use client";

import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  User, 
  ShieldCheck, 
  LogOut,
  Heart,
  ChevronRight,
  Trophy
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
import { useUser, useDoc, useMemoFirebase, useAuth, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { isMobile, setOpenMobile } = useSidebar();

  const userRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(userRef);

  if (!user || pathname === "/" || pathname.startsWith("/auth")) return null;

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
    if (isMobile) setOpenMobile(false);
  };

  const menuItems = [
    { label: "Community Feed", href: "/dashboard", icon: LayoutDashboard },
    { label: "Post Request", href: "/requests/new", icon: PlusCircle },
    { label: "My Activity", href: "/requests/my", icon: History },
    { label: "My Profile", href: "/profile", icon: User },
  ];

  const handleLinkClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-white">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="bg-primary p-2 rounded-xl shrink-0">
            <Heart className="text-white w-5 h-5" />
          </div>
          <span className="font-headline font-bold text-lg group-data-[collapsible=icon]:hidden truncate">
            Local HelpLink
          </span>
        </div>

        <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent overflow-hidden">
          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
            <AvatarFallback className="bg-primary text-white">{profile?.name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-black text-slate-900 truncate">{profile?.name || "Member"}</span>
            <Badge variant="outline" className="w-fit text-[10px] font-black uppercase h-4 px-1.5 mt-0.5 bg-white border-primary/20 text-primary">
              {profile?.role || "user"}
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-4">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    onClick={handleLinkClick}
                    className={cn(
                      "rounded-xl h-11 px-4 transition-all duration-300",
                      pathname === item.href 
                        ? "bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90" 
                        : "text-slate-500 hover:bg-slate-50 font-medium"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className={cn("w-5 h-5", pathname === item.href ? "text-white" : "text-slate-400")} />
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
                    tooltip="Admin Dashboard"
                    onClick={handleLinkClick}
                    className={cn(
                      "rounded-xl h-11 px-4 transition-all duration-300",
                      pathname === '/admin' 
                        ? "bg-secondary text-white font-bold shadow-lg shadow-secondary/20 hover:bg-secondary/90" 
                        : "text-slate-500 hover:bg-slate-50 font-medium"
                    )}
                  >
                    <Link href="/admin">
                      <ShieldCheck className={cn("w-5 h-5", pathname === '/admin' ? "text-white" : "text-slate-400")} />
                      <span>Admin Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              tooltip="Sign Out"
              className="rounded-xl h-11 px-4 text-destructive font-black hover:bg-destructive/5 hover:text-destructive transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
