"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CATEGORY_ICON, money } from "@/lib/utils";

type CartData = {
  items: Array<{ id: string; quantity: number; product: { id: string; name: string; price: string; category?: { name: string } } }>;
  subtotal: number; discount: number; delivery: number; total: number;
};

export default function CartPage() {
  const router = useRouter();
  const [data, setData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to load cart"); return; }
      setData(json);
    } catch {
      setError("Failed to load cart. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeQty(itemId: string, quantity: number) {
    await fetch(`/api/cart/${itemId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity }) });
    load();
  }
  async function remove(itemId: string) {
    await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
    load();
  }

  if (loading) return <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Your Cart</h1>
      <p className="text-sm mb-5 text-slate-500">{data.items.length} item(s)</p>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <Card className="p-5">
          {data.items.length === 0 ? (
            <p className="text-sm text-slate-500">Your cart is empty. <Link href="/shop" className="text-violet-600 font-semibold">Browse products →</Link></p>
          ) : data.items.map((i) => (
            <div key={i.id} className="flex items-center gap-3.5 py-4 border-b border-slate-200 dark:border-slate-700 last:border-0">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl bg-slate-100 dark:bg-slate-800">{CATEGORY_ICON[i.product.category?.name ?? ""] ?? "🛍️"}</div>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${i.product.id}`} className="text-sm font-semibold hover:text-violet-600">{i.product.name}</Link>
                <div className="text-xs text-slate-500">{money(i.product.price)} each</div>
              </div>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                <button onClick={() => changeQty(i.id, i.quantity - 1)} className="w-7 h-7 flex items-center justify-center"><Minus size={13} /></button>
                <span className="w-7 text-center text-sm">{i.quantity}</span>
                <button onClick={() => changeQty(i.id, i.quantity + 1)} className="w-7 h-7 flex items-center justify-center"><Plus size={13} /></button>
              </div>
              <div className="w-20 text-right font-semibold text-sm">{money(Number(i.product.price) * i.quantity)}</div>
              <button onClick={() => remove(i.id)} className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500">Remove</button>
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-3.5">Order Summary</h3>
          <div className="flex gap-2 mb-3.5">
            <input className="field-input" placeholder="Coupon code" />
            <Button variant="ghost" size="sm" className="shrink-0">Apply</Button>
          </div>
          <div className="flex justify-between text-sm py-1.5 text-slate-500"><span>Subtotal</span><span>{money(data.subtotal)}</span></div>
          <div className="flex justify-between text-sm py-1.5 text-slate-500"><span>Discount</span><span>−{money(data.discount)}</span></div>
          <div className="flex justify-between text-sm py-1.5 text-slate-500"><span>Delivery</span><span>{data.delivery === 0 ? "Free" : money(data.delivery)}</span></div>
          <div className="flex justify-between text-base font-bold border-t border-slate-200 dark:border-slate-700 pt-3 mt-1.5"><span>Total</span><span>{money(data.total)}</span></div>
          <Button className="w-full mt-4" disabled={data.items.length === 0} onClick={() => router.push("/checkout")}>Proceed to Checkout</Button>
        </Card>
      </div>
    </div>
  );
}
