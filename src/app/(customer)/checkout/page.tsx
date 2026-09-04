"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { money } from "@/lib/utils";
import { openRazorpayCheckout } from "@/lib/payments/razorpay-client";
import { ShieldCheck, CreditCard, RefreshCw } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [totals, setTotals] = useState<{ subtotal: number; discount: number; delivery: number; total: number } | null>(null);
  const [addressLine, setAddressLine] = useState("123 Tech Park Road");
  const [city, setCity] = useState("Bengaluru");
  const [pincode, setPincode] = useState("560001");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "cod">("upi");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((d) => {
        if (!d.items?.length) {
          router.push("/cart");
          return;
        }
        setTotals({ subtotal: d.subtotal, discount: d.discount, delivery: d.delivery, total: d.total });
      });
  }, [router]);

  async function placeRazorpayOrder() {
    setPlacing(true);
    setError("");

    try {
      // 1. Create Razorpay order
      const createRes = await fetch("/api/orders/razorpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        setError(createData.error || "Could not initialize Razorpay order");
        setPlacing(false);
        return;
      }

      // 2. Open standard checkout modal
      await openRazorpayCheckout({
        keyId: createData.keyId,
        orderId: createData.razorpayOrderId,
        amountPaise: createData.amountPaise,
        currency: createData.currency,
        name: "ShopPilot AI",
        description: `Order Checkout (${createData.breakdown.itemCount} items)`,
        prefill: {
          contact: phone,
        },
        onSuccess: async (paymentResponse) => {
          // 3. Server-side signature verification & order creation
          const verifyRes = await fetch("/api/orders/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
              addressLine,
              city,
              pincode,
              phone,
              paymentMethod,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setError(verifyData.error || "Payment verification failed");
            setPlacing(false);
            return;
          }

          router.push(`/orders/${verifyData.order.id}`);
        },
        onDismiss: () => {
          setPlacing(false);
          setError("Payment window was closed. Your cart is preserved so you can retry whenever you are ready.");
          fetch("/api/orders/razorpay/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: createData.razorpayOrderId,
              amount: createData.amountRupees,
              type: "cancelled",
              reason: "User closed the Razorpay payment modal before completing checkout.",
            }),
          }).catch(() => {});
        },
        onFailure: (err) => {
          setPlacing(false);
          setError(`Payment failed or declined: ${err.description || "Transaction could not be completed"}. Please retry.`);
          fetch("/api/orders/razorpay/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: createData.razorpayOrderId,
              amount: createData.amountRupees,
              type: "failed",
              errorDescription: err.description || "Payment declined or failed at gateway.",
            }),
          }).catch(() => {});
        },
      });
    } catch (err: any) {
      setError(`Payment exception: ${err.message}`);
      setPlacing(false);
    }
  }

  if (!totals) return <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold font-display">Checkout</h1>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
          Razorpay Test Gateway
        </Badge>
      </div>

      <div className="flex gap-1.5 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full ${
              step >= i ? "bg-violet-600" : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 text-xs px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <Card className="p-5 shadow-sm">
          {step === 1 && (
            <>
              <h3 className="font-semibold text-sm mb-4">Shipping Address</h3>
              <div className="mb-4">
                <label className="field-label">Address line</label>
                <input
                  className="field-input"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="123 Tech Park Road"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="mb-4">
                  <label className="field-label">City</label>
                  <input
                    className="field-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bengaluru"
                  />
                </div>
                <div className="mb-4">
                  <label className="field-label">Pincode</label>
                  <input
                    className="field-input"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="560001"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="field-label">Phone</label>
                <input
                  className="field-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-semibold text-sm mb-4">Delivery Method</h3>
              <div className="space-y-2.5">
                <div className="border-2 border-violet-500 rounded-xl p-3.5 text-sm bg-violet-50/20">
                  🚚 <b>Standard Courier</b> — 2-4 days — {totals.delivery === 0 ? "Free" : money(totals.delivery)}
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-500">
                  ⚡ <b>Express Air Delivery</b> — 1 day — ₹149 (Subject to pincode)
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-violet-600" />
                Payment Integration (Razorpay Test Mode)
              </h3>
              <div className="mb-4">
                <label className="field-label">Preferred Method</label>
                <select
                  className="field-input"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cod">Cash on Delivery (Restricted for orders &gt; ₹10,000)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  Razorpay AI Buildathon 2026 Test Environment
                </div>
                <p>
                  Payments are processed via Razorpay in <b>Test Mode</b>. All order creations are verified server-side with HMAC SHA-256 cryptographic signatures.
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2.5 mt-6">
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={placing}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && (!addressLine || !city || !pincode || !phone)}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={placeRazorpayOrder}
                disabled={placing}
                className="w-full sm:w-auto h-11 text-sm font-bold gap-2"
              >
                {placing ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Verifying with Razorpay...
                  </>
                ) : (
                  <>Pay {money(totals.total)} with Razorpay →</>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Order Summary */}
        <Card className="p-5 shadow-sm h-fit">
          <h3 className="font-semibold text-sm mb-3.5">Order Summary</h3>
          <div className="flex justify-between text-xs py-1.5 text-slate-500">
            <span>Subtotal</span>
            <span className="text-slate-800 dark:text-slate-200">{money(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs py-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Agent Discount (5%)</span>
            <span>−{money(totals.discount)}</span>
          </div>
          <div className="flex justify-between text-xs py-1.5 text-slate-500">
            <span>Delivery</span>
            <span>{totals.delivery === 0 ? "FREE" : money(totals.delivery)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-slate-200 dark:border-slate-800 pt-3 mt-2 text-slate-900 dark:text-slate-100">
            <span>Total Payable</span>
            <span className="text-violet-600">{money(totals.total)}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center">
            Transactions are bounded, explainable, and verified server-side.
          </p>
        </Card>
      </div>
    </div>
  );
}
