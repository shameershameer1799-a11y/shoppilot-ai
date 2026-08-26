"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Moon, Sun } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<{ email: string; accountType: string } | null | undefined>(undefined);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ email: data.user.email ?? "", accountType: (data.user.user_metadata?.account_type as string) ?? "customer" });
      } else {
        setUser(null);
      }
    });
  }, [supabase]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg font-display">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-teal-500 text-white flex items-center justify-center text-xs">SP</span>
          ShopPilot AI
        </Link>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDark((d) => !d)}
            className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user === undefined ? null : user ? (
            <Button variant="ghost" onClick={handleLogout}>Log out</Button>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost">Log in</Button></Link>
              <Link href="/signup"><Button>Sign up</Button></Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
