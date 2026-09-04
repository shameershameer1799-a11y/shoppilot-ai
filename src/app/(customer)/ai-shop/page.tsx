"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  Check,
  ShoppingCart,
  ShieldCheck,
  Scale,
  Sparkles,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Package,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MatchRing } from "@/components/ui/MatchRing";
import { money } from "@/lib/utils";
import { openRazorpayCheckout } from "@/lib/payments/razorpay-client";
import type { ProductMatch, CheckoutSummary, ShoppingRequirements } from "@/lib/ai/service";
import type { ProductComparisonResult, UpsellSuggestion } from "@/lib/ai/agents/buyer-tools";

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
  requirements?: ShoppingRequirements;
  matches?: ProductMatch[];
  comparison?: ProductComparisonResult;
  upsells?: UpsellSuggestion[];
  checkout?: CheckoutSummary;
  recoveryAlternative?: {
    originalUnavailable: string;
    reason: string;
    alternatives: ProductMatch[];
  };
  confirmedOrder?: {
    orderNumber: string;
    id: string;
    total: number;
    paymentRef: string;
  };
};

const SUGGESTIONS = [
  "I need a laptop under ₹70,000 for coding and gaming",
  "Compare top 3 laptops",
  "Add recommended laptop and accessories",
  "Proceed to checkout",
  "Simulate out of stock recovery",
];

export default function AiShopPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "ai",
      text:
        "👋 Welcome to **ShopPilot AI Buyer Agent**!\n\n" +
        "I am an agentic shopping assistant with direct access to our real catalog and inventory. " +
        "Tell me what you're shopping for (e.g. *budget, category, use case*), and I will research, rank, compare, and assist you all the way through Razorpay checkout.",
    },
  ]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState("Analyzing intent...");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || thinking) return;

    const userMsgId = `usr_${Date.now()}`;
    setMessages((m) => [...m, { id: userMsgId, role: "user", text }]);
    setInput("");
    setThinking(true);
    setPayError("");

    // Animate thinking steps
    setThinkingStep("Understanding shopping requirements...");
    const t1 = setTimeout(() => setThinkingStep("Searching real catalog & stock..."), 350);
    const t2 = setTimeout(() => setThinkingStep("Ranking matches & checking inventory..."), 700);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, kind: "shopping" }),
      });

      clearTimeout(t1);
      clearTimeout(t2);

      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: `err_${Date.now()}`,
            role: "ai",
            text: data.error || "I encountered an issue processing your request. Please try again.",
          },
        ]);
        return;
      }

      setConversationId(data.conversationId);
      setMessages((m) => [
        ...m,
        {
          id: `ai_${Date.now()}`,
          role: "ai",
          text: data.content,
          requirements: data.requirements,
          matches: data.matches,
          comparison: data.comparison,
          upsells: data.upsells,
          checkout: data.checkout,
          recoveryAlternative: data.recoveryAlternative,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `err_${Date.now()}`,
          role: "ai",
          text: "Couldn't reach the AI service. Please check your network connection and try again.",
        },
      ]);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setThinking(false);
    }
  }

  async function handleAddToCart(productId: string) {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (res.ok) {
        setAddedIds((prev) => [...prev, productId]);
      }
    } catch {
      // Handled silently
    }
  }

  async function executeRazorpayPayment(msgId: string) {
    setPaying(true);
    setPayError("");

    try {
      // 1. Create Razorpay order server-side
      const createRes = await fetch("/api/orders/razorpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        setPayError(createData.error || "Could not initialize Razorpay order");
        setPaying(false);
        return;
      }

      // 2. Open Razorpay Checkout Dialog
      await openRazorpayCheckout({
        keyId: createData.keyId,
        orderId: createData.razorpayOrderId,
        amountPaise: createData.amountPaise,
        currency: createData.currency,
        name: "ShopPilot AI",
        description: `Order Checkout (${createData.breakdown.itemCount} items)`,
        onSuccess: async (paymentResponse) => {
          // 3. Server-side signature verification & order finalization
          const verifyRes = await fetch("/api/orders/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
              addressLine: "101 AI Commerce Blvd",
              city: "Bengaluru",
              pincode: "560001",
              phone: "+91 98765 43210",
              paymentMethod: "upi",
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setPayError(verifyData.error || "Payment verification failed");
            setPaying(false);
            return;
          }

          // 4. Update message UI to show confirmed order
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === msgId) {
                return {
                  ...msg,
                  confirmedOrder: {
                    orderNumber: verifyData.order.orderNumber,
                    id: verifyData.order.id,
                    total: Number(verifyData.order.total),
                    paymentRef: paymentResponse.razorpay_payment_id,
                  },
                };
              }
              return msg;
            })
          );
          setPaying(false);
        },
        onDismiss: () => {
          setPaying(false);
          setPayError("Payment was cancelled. Your cart is preserved so you can retry whenever you are ready.");
          fetch("/api/orders/razorpay/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: createData.razorpayOrderId,
              amount: createData.amountRupees,
              type: "cancelled",
              reason: "User closed the Razorpay payment modal in AI Shop.",
            }),
          }).catch(() => {});
        },
        onFailure: (error) => {
          setPaying(false);
          setPayError(`Payment failed or declined: ${error.description || "Transaction could not be processed"}. Please retry or choose another method.`);
          fetch("/api/orders/razorpay/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: createData.razorpayOrderId,
              amount: createData.amountRupees,
              type: "failed",
              errorDescription: error.description || "Payment declined or failed in AI Shop.",
            }),
          }).catch(() => {});
        },
      });
    } catch (err: any) {
      setPayError(`Payment error: ${err.message}`);
      setPaying(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display">AI Shopping Agent</h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
              ● Razorpay Active
            </Badge>
            <Badge className="bg-violet-100 text-violet-800 border-violet-200">
              Bounded Money Actions
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Autonomous product discovery, technical comparison, cross-sells, and agentic checkout
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cart">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ShoppingCart size={15} />
              View Cart
            </Button>
          </Link>
          <Link href="/shop">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              Catalog View
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-5" style={{ height: "calc(100vh - 210px)" }}>
        {/* Chat Stream */}
        <Card className="flex flex-col overflow-hidden shadow-sm">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="bg-violet-600 text-white text-sm px-4 py-3 rounded-2xl rounded-br-sm ml-auto max-w-[85%] shadow-sm"
                >
                  {m.text}
                </div>
              ) : (
                <div
                  key={m.id}
                  className="text-sm px-4 py-3.5 rounded-2xl rounded-bl-sm border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 max-w-[95%] space-y-3"
                >
                  <div className="whitespace-pre-line text-slate-800 dark:text-slate-200 leading-relaxed">
                    {m.text}
                  </div>

                  {/* Out of Stock Recovery Notice */}
                  {m.recoveryAlternative && (
                    <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                        <span>Unavailable: {m.recoveryAlternative.originalUnavailable}</span>
                      </div>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        {m.recoveryAlternative.reason}
                      </p>
                    </div>
                  )}

                  {/* Product Match Cards */}
                  {m.matches && m.matches.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      {m.matches.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-violet-300 transition"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <MatchRing score={p.score} />
                            <div className="min-w-0">
                              <Link
                                href={`/products/${p.id}`}
                                className="font-semibold text-sm hover:text-violet-600 truncate block text-slate-900 dark:text-slate-100"
                              >
                                {p.name}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                  {money(p.price)}
                                </span>
                                {p.mrp > p.price && (
                                  <span className="text-xs line-through text-slate-400">
                                    {money(p.mrp)}
                                  </span>
                                )}
                                <span className="text-xs text-amber-500 font-semibold">
                                  ★ {Number(p.rating).toFixed(1)}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    p.stock > 0
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {p.reasons.map((r, ri) => (
                                  <span
                                    key={ri}
                                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                  >
                                    ✓ {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="w-full sm:w-auto h-8 text-xs font-semibold"
                              onClick={() => handleAddToCart(p.id)}
                              disabled={addedIds.includes(p.id) || p.stock === 0}
                            >
                              {addedIds.includes(p.id) ? "Added ✓" : "Add to Cart"}
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Quick Action: Compare top candidates */}
                      {m.matches.length >= 2 && !m.comparison && (
                        <button
                          onClick={() => send("Compare these products in detail")}
                          className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-semibold pt-1"
                        >
                          <Scale size={14} /> Compare these options side-by-side →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Side-by-Side Comparison UI */}
                  {m.comparison && (
                    <div className="mt-3 p-4 rounded-xl border border-violet-200 dark:border-violet-900/60 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-bold text-xs uppercase tracking-wider">
                        <Scale size={15} /> Side-by-Side Technical Comparison
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {m.comparison.products.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 flex flex-col justify-between"
                          >
                            <div>
                              <b className="text-xs block text-slate-800 dark:text-slate-100 mb-1">
                                {item.name}
                              </b>
                              <div className="text-xs font-bold text-violet-600 mb-2">
                                {money(item.price)}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-500 mb-1">
                                Best For:
                              </div>
                              <div className="text-xs text-slate-700 dark:text-slate-300 mb-3 italic">
                                &quot;{item.bestFor}&quot;
                              </div>
                              <div className="text-[11px] font-semibold text-emerald-600 mb-1">
                                Key Advantages:
                              </div>
                              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 mb-2">
                                {item.advantages.map((adv, ai) => (
                                  <li key={ai}>+ {adv}</li>
                                ))}
                              </ul>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs h-8 mt-2"
                              onClick={() => handleAddToCart(item.id)}
                              disabled={addedIds.includes(item.id)}
                            >
                              {addedIds.includes(item.id) ? "In Cart ✓" : "Select this model"}
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {m.comparison.summaryRecommendation}
                      </p>
                    </div>
                  )}

                  {/* Upsell / Cross-Sell Accessory Recommendations */}
                  {m.upsells && m.upsells.length > 0 && (
                    <div className="mt-3 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-indigo-600" />
                          Recommended Accessories (Cross-Sell)
                        </span>
                        <span className="text-[10px] text-indigo-600 font-medium">
                          Explainable Recommendation
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {m.upsells.map((u, ui) => (
                          <div
                            key={ui}
                            className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 text-xs flex justify-between items-center gap-2"
                          >
                            <div>
                              <b className="block text-slate-800 dark:text-slate-100">
                                {u.product.name}
                              </b>
                              <span className="text-slate-600 dark:text-slate-400 font-medium">
                                {money(u.product.price)}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                {u.relationReason}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 h-7 text-[11px] px-2"
                              onClick={() => handleAddToCart(u.product.id)}
                              disabled={addedIds.includes(u.product.id)}
                            >
                              {addedIds.includes(u.product.id) ? "Added ✓" : "+ Add"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bounded Checkout Authorization Card */}
                  {m.checkout && !m.confirmedOrder && (
                    <div className="mt-3 p-4 rounded-xl border-2 border-violet-500 bg-white dark:bg-slate-900 shadow-md space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100">
                          <CreditCard size={18} className="text-violet-600" />
                          Payment Authorization Required
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                          Human Gate Active
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span>Items ({m.checkout.itemCount})</span>
                          <span>{money(m.checkout.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                          <span>Agent Bounded Discount (5%)</span>
                          <span>−{money(m.checkout.discount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery</span>
                          <span>{m.checkout.delivery === 0 ? "FREE" : money(m.checkout.delivery)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span>Final Total Payable</span>
                          <span className="text-violet-600">{money(m.checkout.total)}</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                          <ShieldCheck size={14} className="text-emerald-600" />
                          Explainable Financial Safety Policy
                        </div>
                        <p>
                          • Single transaction cap: <b>₹5,00,000</b>. Your transaction: <b>{money(m.checkout.total)}</b>.
                          <br />
                          • Autonomous silent charging is strictly disabled. Payment must be explicitly initiated by you via Razorpay.
                        </p>
                      </div>

                      {payError && (
                        <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                          {payError}
                        </div>
                      )}

                      <Button
                        className="w-full h-11 text-sm font-bold gap-2"
                        onClick={() => executeRazorpayPayment(m.id)}
                        disabled={paying}
                      >
                        {paying ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" /> Verifying with Razorpay...
                          </>
                        ) : (
                          <>
                            Confirm &amp; Pay {money(m.checkout.total)} with Razorpay →
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Confirmed Order State */}
                  {m.confirmedOrder && (
                    <div className="mt-3 p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                          <Check size={18} className="text-emerald-600" /> Order Confirmed &amp; Payment Verified!
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                          HMAC Verified
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <div>Order Number: <b>{m.confirmedOrder.orderNumber}</b></div>
                        <div>Total Paid: <b>{money(m.confirmedOrder.total)}</b></div>
                        <div className="text-[11px] text-slate-500">Payment Reference: {m.confirmedOrder.paymentRef}</div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Link href={`/orders/${m.confirmedOrder.id}`}>
                          <Button size="sm" className="text-xs gap-1.5">
                            <Package size={14} /> Track Order
                          </Button>
                        </Link>
                        <Link href="/orders">
                          <Button size="sm" variant="outline" className="text-xs">
                            All Orders
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Thinking Indicator */}
            {thinking && (
              <div className="p-3.5 rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 text-xs flex items-center gap-2.5 font-mono">
                <RefreshCw size={14} className="animate-spin text-violet-600" />
                <span>{thinkingStep}</span>
              </div>
            )}
          </div>

          {/* Quick Suggestions */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
            {SUGGESTIONS.map((s, si) => (
              <button
                key={si}
                onClick={() => send(s)}
                className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-500 hover:text-violet-600 bg-white dark:bg-slate-800 transition shrink-0"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 shrink-0">
            <input
              className="field-input text-sm"
              placeholder="e.g. Find me a laptop under ₹70,000 for coding and gaming..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <Button onClick={() => send()} disabled={!input.trim() || thinking} className="px-5">
              <Send size={15} />
            </Button>
          </div>
        </Card>

        {/* Sidebar Info & Telemetry */}
        <Card className="p-4.5 flex flex-col justify-between text-xs text-slate-500 space-y-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <b className="text-sm block text-slate-900 dark:text-slate-100 mb-1.5 font-display">
                How the Buyer Agent Operates
              </b>
              <p className="text-[11px] leading-relaxed">
                The agent follows strict governed execution:
              </p>
              <ol className="list-decimal pl-4 mt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <li><b>Extracts Intent:</b> Parses budget limits, category, and usage context.</li>
                <li><b>Real Catalog Search:</b> Queries active stock with zero hallucinated inventory.</li>
                <li><b>Side-by-Side Comparison:</b> Evaluates hardware specs, advantages, and drawbacks.</li>
                <li><b>Cross-Sell Intelligence:</b> Recommends accessory pairings with explainable reasoning.</li>
                <li><b>Bounded Checkout:</b> Validates max limits, caps discounts, and requires human confirmation before Razorpay.</li>
              </ol>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <b className="text-xs block text-slate-900 dark:text-slate-100 mb-1.5">
                Financial Safeguards
              </b>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between py-0.5">
                  <span>Max Order Cap:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">₹5,00,000</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Max Agent Discount:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">15%</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Payment Gateway:</span>
                  <span className="font-semibold text-violet-600">Razorpay Test Mode</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Signature Verification:</span>
                  <span className="font-semibold text-emerald-600">HMAC-SHA256 Server</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <b className="text-xs block text-slate-900 dark:text-slate-100 mb-1.5">
                Buildathon Demo Shortcuts
              </b>
              <div className="space-y-1.5">
                <button
                  onClick={() => send("I need a laptop under ₹70,000 for coding and gaming")}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-violet-50 text-[11px] text-slate-700 dark:text-slate-300 transition"
                >
                  🚀 <b>Demo Flow:</b> Laptop under ₹70k
                </button>
                <button
                  onClick={() => send("Compare top 3 laptops")}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-violet-50 text-[11px] text-slate-700 dark:text-slate-300 transition"
                >
                  ⚖️ <b>Demo Flow:</b> Product Comparison
                </button>
                <button
                  onClick={() => send("Simulate out of stock recovery")}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-violet-50 text-[11px] text-slate-700 dark:text-slate-300 transition"
                >
                  ⚠️ <b>Demo Flow:</b> Out of Stock Recovery
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
            Razorpay AI Buildathon 2026 · Track: AI Growth &amp; Agentic Commerce
          </div>
        </Card>
      </div>
    </div>
  );
}
