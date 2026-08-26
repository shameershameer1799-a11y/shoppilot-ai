"use client";

import { useEffect, useState } from "react";
import { ProductGrid } from "@/components/customer/ProductGrid";

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wishlist").then((r) => r.json()).then((d) => setItems(d.items ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Wishlist</h1>
      <p className="text-sm mb-5 text-slate-500">{items.length} saved item(s)</p>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : (
        <ProductGrid products={items.map((i) => i.product)} wishedIds={items.map((i) => i.productId)} />
      )}
    </div>
  );
}
