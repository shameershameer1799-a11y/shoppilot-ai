"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * useSearchParams() opts a page out of static rendering unless the
 * component using it is wrapped in Suspense — otherwise `next build`
 * fails with "should be wrapped in a suspense boundary". The ?type=
 * query param (used by the landing page's "Grow Your Business" CTA)
 * only matters after JS loads anyway, so a brief fallback is fine.
 */
export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupFallback() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center px-5 py-16">
        <Card className="w-full max-w-sm p-8 shadow-lg">
          <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </Card>
      </div>
    </div>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [accountType, setAccountType] = useState<"customer" | "business">(
    (searchParams.get("type") as "customer" | "business") || "customer"
  );
  const [storeName, setStoreName] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName || !email || !password || password !== password2 || !terms) {
      setError("Please fill all fields correctly and accept the terms.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, accountType, storeName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed"); return; }
      router.push(accountType === "business" ? "/business/dashboard" : "/dashboard");
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
          <h2 className="text-xl font-bold mb-1 font-display">Create your account</h2>
          <p className="text-sm mb-6 text-slate-500">Join ShopPilot AI in seconds</p>
          {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="field-label">Full name</label>
              <input className="field-input" placeholder="Jordan Lee" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="field-label">Confirm password</label>
              <input className="field-input" type="password" placeholder="••••••••" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="field-label">Account type</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => setAccountType("customer")}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold ${accountType === "customer" ? "border-violet-500 text-violet-600 bg-violet-50" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>
                  🛍️ Customer
                </button>
                <button type="button" onClick={() => setAccountType("business")}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold ${accountType === "business" ? "border-violet-500 text-violet-600 bg-violet-50" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>
                  🏢 Business
                </button>
              </div>
            </div>
            {accountType === "business" && (
              <div className="mb-4">
                <label className="field-label">Store name</label>
                <input className="field-input" placeholder="Your Store" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
            )}
            <label className="flex items-center gap-2 text-xs mb-5 text-slate-500">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> I agree to the Terms &amp; Privacy Policy
            </label>
            <Button className="w-full" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create Account"}</Button>
          </form>
          <div className="text-center text-sm mt-5 text-slate-500">
            Already have an account? <Link href="/login" className="text-violet-600 font-semibold">Log in</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
