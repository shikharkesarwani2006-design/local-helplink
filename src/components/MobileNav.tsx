
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, History, User, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useUser();

  if (!user || pathname === "/" || pathname.startsWith("/auth")) return null;

  const tabs = [
    { label: "Feed", href: "/dashboard", icon: LayoutDashboard },
    { label: "Post", href: "/requests/new", icon: PlusCircle },
    { label: "History", href: "/requests/my", icon: History },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t px-4 py-2 flex justify-around items-end shadow-[0_-5px_20px_rgba(0,0,0,0.05)] rounded-t-3xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;

        return (
          <Link 
            key={tab.href} 
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-1 py-1 px-3 transition-all duration-300 relative",
              isActive ? "text-primary -translate-y-2" : "text-slate-400"
            )}
          >
            {isActive && (
              <span className="absolute -top-1 w-1 h-1 bg-primary rounded-full animate-pulse" />
            )}
            <div className={cn(
              "p-2 rounded-2xl transition-all duration-300",
              isActive ? "bg-primary text-white shadow-lg shadow-primary/30" : ""
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", isActive ? "opacity-100" : "opacity-0 h-0 overflow-hidden")}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
