
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { 
  useAuth, 
  useUser, 
  useFirestore, 
  useDoc, 
  useCollection,
  useMemoFirebase 
} from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  doc, 
  limit 
} from "firebase/firestore";
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
import { Heart, PlusCircle, LayoutDashboard, History, User, LogOut, Bell, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  // 1. Listen for user profile
  const userRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(userRef);

  // 2. Real-time Notifications Listener
  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "notifications", user.uid, "items"),
      where("read", "==", false),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [db, user?.uid]);
  const { data: unreadNotifications } = useCollection(notificationsQuery);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const navItems = [
    { label: "Feed", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "My Requests", href: "/requests/my", icon: <History className="w-4 h-4" /> },
    { label: "Profile", href: "/profile", icon: <User className="w-4 h-4" /> },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ label: "Admin", href: "/admin", icon: <ShieldCheck className="w-4 h-4" /> });
  }

  return (
    <nav className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Heart className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-headline font-bold text-secondary">Local HelpLink</span>
        </Link>

        <div className="hidden lg:flex gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={`gap-2 ${pathname === item.href ? "text-secondary font-bold bg-secondary/10" : "text-slate-600"}`}
              >
                {item.icon}
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/requests/new">
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-full px-5 shadow-sm">
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline font-bold">Post Request</span>
          </Button>
        </Link>

        {/* Real-time Notification Bell */}
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:bg-slate-50">
          <Bell className="w-5 h-5" />
          {unreadNotifications && unreadNotifications.length > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white ring-2 ring-white animate-in zoom-in">
              {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
            </span>
          )}
        </Button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-slate-100 hover:ring-secondary/20 transition-all">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                  <AvatarFallback>{user.email?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="right" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold leading-none">{profile?.name || user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold text-accent border-accent/20">
                      {profile?.role}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">Profile Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/requests/my" className="cursor-pointer">My Requests</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive font-bold cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
