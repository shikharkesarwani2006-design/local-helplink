
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
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";

export default function Navbar() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(userRef);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const navItems = [
    { label: "Feed", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "My Activity", href: "/requests/my", icon: <History className="w-4 h-4" /> },
    { label: "Profile", href: "/profile", icon: <User className="w-4 h-4" /> },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ label: "Admin", href: "/admin", icon: <ShieldCheck className="w-4 h-4" /> });
  }

  return (
    <nav className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 lg:px-10">
      <div className="flex items-center gap-10">
        <Link href="/dashboard" className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
          <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20">
            <Heart className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-headline font-bold text-slate-900 tracking-tight">Local HelpLink</span>
        </Link>

        <div className="hidden lg:flex gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={`gap-2 rounded-xl h-10 px-4 transition-all duration-300 ${pathname === item.href ? "bg-primary/10 text-primary font-bold shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
              >
                {item.icon}
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/requests/new" className="hidden sm:block">
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-full px-6 font-bold shadow-xl shadow-primary/20">
            <PlusCircle className="w-4 h-4" />
            Post Mission
          </Button>
        </Link>

        <NotificationDrawer />

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-slate-100 hover:ring-primary/20 transition-all p-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                  <AvatarFallback className="bg-indigo-100 text-primary font-bold">{user.email?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-2xl p-2 shadow-2xl border-none mt-2" align="right" forceMount>
              <DropdownMenuLabel className="p-4">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-black text-slate-900 leading-none">{profile?.name || user.email}</p>
                  <p className="text-xs font-medium text-slate-400">{user.email}</p>
                  <div className="mt-3 flex gap-2">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 border-primary/10">
                      {profile?.role}
                    </Badge>
                    {profile?.verified && (
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border-emerald-100">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-50 mx-2" />
              <div className="p-1">
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-bold text-slate-600">
                  <Link href="/profile">My Impact Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-bold text-slate-600">
                  <Link href="/requests/my">Missions History</Link>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-slate-50 mx-2" />
              <div className="p-1">
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl text-destructive font-black cursor-pointer py-2.5 hover:bg-destructive/5">
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
