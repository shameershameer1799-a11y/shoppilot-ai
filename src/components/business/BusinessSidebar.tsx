"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, ShoppingCart, Users, TrendingUp, Megaphone, Bot, Settings, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/business/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/business/products", label: "Products", icon: Package },
  { href: "/business/orders", label: "Orders", icon: ShoppingCart },
  { href: "/business/customers", label: "Customers", icon: Users },
  { href: "/business/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/business/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/business/ai-insights", label: "AI Insights", icon: Lightbulb },
  { href: "/business/ai-growth", label: "AI Growth Assistant", icon: Bot },
  { href: "/business/settings", label: "Settings", icon: Settings },
];

export function BusinessSidebar() {
  const pathname = usePathname();
  return (
    <div className="border-r border-slate-200 dark:border-slate-700 p-3.5 hidden md:block bg-white dark:bg-slate-900">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
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
