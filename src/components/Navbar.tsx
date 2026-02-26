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
  ChevronDown,
  Bell
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

  const getPageTitle = () => {
    switch(pathname) {
      case '/dashboard': return 'Community Feed';
      case '/requests/new': return 'New Request';
      case '/requests/my': return 'My Requests';
      case '/profile': return 'My Profile';
      case '/admin': return 'Admin Oversight';
      default: return 'Local HelpLink';
    }
  }

  return (
    <nav className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hover:bg-slate-100 rounded-xl h-10 w-10 md:hidden" />
        <h1 className="text-xl font-headline font-bold text-slate-900 tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/requests/new" className="hidden sm:block mr-2">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-full px-5 font-bold shadow-lg shadow-primary/20">
            <PlusCircle className="w-4 h-4" />
            Post Request
          </Button>
        </Link>

        <div className="relative">
          <NotificationDrawer />
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="group flex items-center gap-2 h-10 px-1 rounded-full hover:bg-slate-100">
                <Avatar className="h-8 w-8 ring-2 ring-white">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                  <AvatarFallback className="bg-primary text-white font-bold">{user.email?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-2xl p-2 shadow-2xl border-none mt-2" align="right">
              <DropdownMenuLabel className="p-4">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold text-slate-900">{profile?.name || "Member"}</p>
                  <p className="text-xs font-medium text-slate-400 truncate">{user.email}</p>
                  <div className="mt-3">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 border-primary/10">
                      {profile?.role}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-50" />
              <div className="p-1">
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-medium text-slate-600 focus:bg-primary/5 focus:text-primary">
                  <Link href="/profile" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>View Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-medium text-slate-600 focus:bg-primary/5 focus:text-primary">
                  <Link href="/profile" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-slate-50" />
              <div className="p-1">
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl text-red-500 font-bold cursor-pointer py-2.5 hover:bg-red-50 focus:bg-red-50 focus:text-red-500">
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