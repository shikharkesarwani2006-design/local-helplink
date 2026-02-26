
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
  Heart, 
  PlusCircle, 
  LogOut, 
  User, 
  Settings, 
  History, 
  ShieldCheck,
  ChevronDown
} from "lucide-react";
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

  return (
    <nav className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hover:bg-slate-100 rounded-xl h-10 w-10" />
        
        <Link href="/dashboard" className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 group">
          <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform">
            <Heart className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-headline font-bold text-slate-900 tracking-tight hidden sm:block">
            Local HelpLink
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/requests/new" className="hidden md:block">
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-full px-6 font-bold shadow-lg shadow-primary/20 border-none transition-all hover:scale-105">
            <PlusCircle className="w-4 h-4" />
            Post Mission
          </Button>
        </Link>

        <NotificationDrawer />

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="group flex items-center gap-2 h-11 px-2 rounded-2xl hover:bg-slate-50 transition-all">
                <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                  <AvatarFallback className="bg-primary text-white font-bold">{user.email?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start min-w-0">
                  <span className="text-xs font-black text-slate-900 leading-none">{profile?.name || "Member"}</span>
                  <span className="text-[10px] font-bold text-slate-400 mt-1 capitalize">{profile?.role}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-2xl p-2 shadow-2xl border-none mt-2" align="right">
              <DropdownMenuLabel className="p-4">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-black text-slate-900">{profile?.name || "Member"}</p>
                  <p className="text-[10px] font-medium text-slate-400 truncate">{user.email}</p>
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
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-bold text-slate-600 focus:bg-primary/5 focus:text-primary">
                  <Link href="/profile" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>View Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-bold text-slate-600 focus:bg-primary/5 focus:text-primary">
                  <Link href="/requests/my" className="flex items-center w-full">
                    <History className="mr-2 h-4 w-4" />
                    <span>My Activity</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-bold text-slate-600 focus:bg-primary/5 focus:text-primary">
                  <Link href="/profile" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                {profile?.role === 'admin' && (
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-bold text-secondary focus:bg-secondary/5 focus:text-secondary">
                    <Link href="/admin" className="flex items-center w-full">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      <span>Admin Oversight</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </div>
              <DropdownMenuSeparator className="bg-slate-50 mx-2" />
              <div className="p-1">
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl text-destructive font-black cursor-pointer py-2.5 hover:bg-destructive/5 focus:bg-destructive/5 focus:text-destructive">
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
