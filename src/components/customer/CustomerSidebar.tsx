"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Bot, ShoppingCart, Package, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/ai-shop", label: "AI Shop", icon: Bot },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
];

export function CustomerSidebar() {
  const pathname = usePathname();
  return (
    <div className="border-r border-slate-200 dark:border-slate-700 p-3.5 hidden md:block bg-white dark:bg-slate-900">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5",
              active ? "bg-violet-100 text-violet-700 font-semibold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Icon size={16} /> {label}
          </Link>
        );
      })}
    </div>
  );
}
