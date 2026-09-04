"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  Menu, X, Sun, Moon, Home, ShoppingBag, Bot, ShoppingCart,
  Package, Heart, User, LogOut, BarChart3, Users, TrendingUp,
  Megaphone, Lightbulb, Settings, ChevronRight, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const CUSTOMER_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/ai-shop", label: "AI Shop", icon: Bot },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
];

const BUSINESS_LINKS = [
  { href: "/business/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/business/products", label: "Products", icon: Package },
  { href: "/business/orders", label: "Orders", icon: ShoppingCart },
  { href: "/business/customers", label: "Customers", icon: Users },
  { href: "/business/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/business/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/business/ai-insights", label: "AI Insights", icon: Lightbulb },
  { href: "/business/ai-growth", label: "AI Growth Assistant", icon: Bot },
  { href: "/business/audit-trail", label: "Agent Audit Trail", icon: ShieldCheck },
  { href: "/business/settings", label: "Settings", icon: Settings },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<{ email: string; accountType: string } | null | undefined>(undefined);
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email ?? "",
          accountType: (data.user.user_metadata?.account_type as string) ?? "customer",
        });
      } else {
        setUser(null);
      }
    });
  }, [supabase]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close drawer on route change or ESC key
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isBusinessSection = pathname.startsWith("/business") || user?.accountType === "business";
  const navLinks = isBusinessSection ? BUSINESS_LINKS : CUSTOMER_LINKS;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden w-10 h-10 -ml-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
              aria-label={menuOpen ? "Close menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg font-display tracking-tight">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-teal-500 text-white flex items-center justify-center text-xs font-mono shadow-sm">
                SP
              </span>
              <span className="text-slate-900 dark:text-white">ShopPilot AI</span>
            </Link>
          </div>

          {/* Right actions: Dark Mode & Auth Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Desktop Auth Actions */}
            <div className="hidden md:flex items-center gap-2">
              {user === undefined ? null : user ? (
                <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-1.5">
                  <LogOut size={14} /> Log out
                </Button>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Log in</Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">Sign up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div
            className="relative w-72 max-w-[82vw] bg-white dark:bg-slate-900 h-full shadow-2xl z-50 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 border-r border-slate-200 dark:border-slate-800"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            {/* Drawer Top Header */}
            <div>
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 font-bold font-display">
                  <span className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-600 to-teal-500 text-white flex items-center justify-center text-xs font-mono">
                    SP
                  </span>
                  <span className="text-slate-900 dark:text-white text-base">ShopPilot AI</span>
                </Link>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-3 space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {isBusinessSection ? "Business Portal" : "Navigation"}
                </div>
                {navLinks.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== "/dashboard" && href !== "/business/dashboard" && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition min-h-[44px]",
                        active
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 font-semibold"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={active ? "text-violet-600 dark:text-violet-400" : "text-slate-500"} />
                        <span>{label}</span>
                      </div>
                      <ChevronRight size={14} className="opacity-40" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom Actions & User Info */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              {user ? (
                <div className="space-y-3">
                  <div className="px-2">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{user.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 gap-2 h-11 text-sm font-medium"
                  >
                    <LogOut size={16} /> Log out
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="block">
                    <Button variant="ghost" className="w-full h-11 text-sm font-semibold">Log in</Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} className="block">
                    <Button className="w-full h-11 text-sm font-semibold">Sign up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
