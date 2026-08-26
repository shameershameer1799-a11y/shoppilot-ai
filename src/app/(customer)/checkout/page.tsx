"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { money } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [totals, setTotals] = useState<{ subtotal: number; discount: number; delivery: number; total: number } | null>(null);
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "cod">("card");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cart").then((r) => r.json()).then((d) => {
      if (!d.items?.length) { router.push("/cart"); return; }
      setTotals({ subtotal: d.subtotal, discount: d.discount, delivery: d.delivery, total: d.total });
    });
  }, [router]);

  async function placeOrder() {
    setPlacing(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressLine, city, pincode, phone, paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not place order"); return; }
      router.push(`/orders/${data.order.id}`);
    } finally {
      setPlacing(false);
    }
  }

  if (!totals) return <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 font-display">Checkout</h1>
      <div className="flex gap-1.5 mb-6">
        {[1, 2, 3].map((i) => <div key={i} className={`flex-1 h-1.5 rounded-full ${step >= i ? "bg-violet-600" : "bg-slate-200 dark:bg-slate-700"}`} />)}
      </div>
      {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-4">{error}</div>}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <Card className="p-5">
          {step === 1 && (
            <>
              <h3 className="font-semibold mb-4">Address</h3>
              <div className="mb-4"><label className="field-label">Address line</label><input className="field-input" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="123 MG Road" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="mb-4"><label className="field-label">City</label><input className="field-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Hyderabad" /></div>
                <div className="mb-4"><label className="field-label">Pincode</label><input className="field-input" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="500001" /></div>
              </div>
              <div className="mb-4"><label className="field-label">Phone</label><input className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 90000 00000" /></div>
            </>
          )}
          {step === 2 && (
            <>
              <h3 className="font-semibold mb-4">Delivery</h3>
              <div className="space-y-2.5">
                <div className="border-2 border-violet-500 rounded-xl p-3.5 text-sm">🚚 <b>Standard Delivery</b> — 3-5 days — {totals.delivery === 0 ? "Free" : money(totals.delivery)}</div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm">⚡ <b>Express Delivery</b> — 1-2 days — ₹149</div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h3 className="font-semibold mb-4">Payment</h3>
              <div className="mb-4">
                <label className="field-label">Payment method</label>
                <select className="field-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
              </div>
              <p className="text-xs text-slate-500">If Stripe isn&apos;t configured, this order is placed with mock payment processing — no real transaction occurs.</p>
            </>
          )}
          <div className="flex gap-2.5 mt-6">
            {step > 1 && <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>}
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && (!addressLine || !city || !pincode || !phone)}>Continue</Button>
            ) : (
              <Button onClick={placeOrder} disabled={placing}>{placing ? "Placing order..." : "Place Order"}</Button>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-3.5">Order Summary</h3>
          <div className="flex justify-between text-sm py-1.5 text-slate-500"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
          <div className="flex justify-between text-sm py-1.5 text-slate-500"><span>Discount</span><span>−{money(totals.discount)}</span></div>
          <div className="flex justify-between text-sm py-1.5 text-slate-500"><span>Delivery</span><span>{totals.delivery === 0 ? "Free" : money(totals.delivery)}</span></div>
          <div className="flex justify-between text-base font-bold border-t border-slate-200 dark:border-slate-700 pt-3 mt-1.5"><span>Total</span><span>{money(totals.total)}</span></div>
        </Card>
      </div>
    </div>
  );
}
