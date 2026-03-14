
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { 
  useAuth, 
  useUser, 
  useFirestore, 
  useDoc, 
  useMemoFirebase 
} from "@/firebase";
import { doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  PlusCircle, 
  LogOut, 
  User, 
  Settings, 
  ChevronDown,
} from "lucide-react";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { user } = useUser();
  const { auth } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(userRef);

  // Hide Navbar on Landing and Auth pages
  if (!user || pathname === "/" || pathname.startsWith("/auth")) return null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getPageTitle = () => {
    // Admin routes
    if (pathname === '/admin') return 'Admin Overview';
    if (pathname === '/admin/users') return 'Citizen Directory';
    if (pathname === '/admin/requests') return 'All Requests';
    if (pathname === '/admin/providers') return 'Provider Monitor';
    if (pathname === '/admin/announcements') return 'Announcements';
    if (pathname === '/admin/verifications') return 'Provider Approvals';

    // Standard routes
    if (pathname === '/dashboard') return 'Community Feed';
    if (pathname === '/requests/new') return 'New Request';
    if (pathname === '/requests/my') return 'My Requests';
    if (pathname === '/profile') return 'My Profile';
    if (pathname === '/settings') return 'Account Settings';
    if (pathname.startsWith('/provider/profile')) return 'Expert Profile';
    if (pathname.startsWith('/provider/jobs')) return 'Available Jobs';
    
    return 'Local HelpLink';
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <nav className="h-16 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8" role="navigation" aria-label="Main Navigation">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl h-10 w-10 md:hidden" aria-label="Open Sidebar" />
        <h1 className="text-xl font-headline font-bold text-slate-900 dark:text-white tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {isAdmin ? (
          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-full mr-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Admin Panel</span>
          </div>
        ) : (
          <Link href="/requests/new" className="hidden sm:block mr-2">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-full px-5 font-bold shadow-lg shadow-primary/20">
              <PlusCircle className="w-4 h-4" />
              Post Request
            </Button>
          </Link>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {isAdmin && (
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </Button>
          )}
          <NotificationDrawer />
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="group flex items-center gap-2 h-10 px-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="User Menu">
                <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-700">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                  <AvatarFallback className="bg-primary text-white font-bold">{user.email?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-2xl p-2 shadow-2xl border-none mt-2" align="right">
              <DropdownMenuLabel className="p-4">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{profile?.name || "Member"}</p>
                  <p className="text-xs font-medium text-slate-400 truncate">{user.email}</p>
                  <div className="mt-3">
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-black uppercase tracking-widest border-primary/10",
                      isAdmin ? "bg-red-500 text-white border-none" : "bg-primary/5 text-primary"
                    )}>
                      {profile?.role}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-50 dark:bg-slate-800" />
              <div className="p-1">
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-medium text-slate-600 dark:text-slate-300 focus:bg-primary/5 focus:text-primary">
                  <Link href={isAdmin ? "/admin" : "/profile"} className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>{isAdmin ? "Admin Overview" : "View Profile"}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-medium text-slate-600 dark:text-slate-300 focus:bg-primary/5 focus:text-primary">
                  <Link href="/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-slate-50 dark:bg-slate-800" />
              <div className="p-1">
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl text-red-500 font-bold cursor-pointer py-2.5 hover:bg-red-50 dark:hover:bg-red-950 focus:bg-red-50 dark:focus:bg-red-950 focus:text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
