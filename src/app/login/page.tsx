"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter both email and password."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      router.push(data.user.accountType === "business" ? "/business/dashboard" : "/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center px-5 py-16">
        <Card className="w-full max-w-sm p-8 shadow-lg">
          <h2 className="text-xl font-bold mb-1 font-display">Welcome back</h2>
          <p className="text-sm mb-6 text-slate-500">Log in to your ShopPilot AI account</p>
          {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex justify-between items-center text-xs mb-5">
              <label className="flex items-center gap-1.5 text-slate-500"><input type="checkbox" /> Remember me</label>
              <Link href="#" className="text-violet-600 font-semibold">Forgot password?</Link>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>{loading ? "Logging in..." : "Log In"}</Button>
          </form>
          <div className="bg-teal-50 text-teal-700 text-xs px-3 py-2 rounded-lg mt-4">
            Demo mode: create an account via Sign up — Supabase Auth manages real sessions once configured.
          </div>
          <div className="text-center text-sm mt-5 text-slate-500">
            Don&apos;t have an account? <Link href="/signup" className="text-violet-600 font-semibold">Sign up</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
