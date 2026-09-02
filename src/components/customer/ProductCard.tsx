"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CATEGORY_ICON, money } from "@/lib/utils";

export type ProductCardData = {
  id: string;
  name: string;
  price: string;
  mrp: string;
  rating: string;
  reviewCount: number;
  category?: { name: string } | null;
  images?: string[] | null;
};

export function ProductCard({ product, initialWished = false }: { product: ProductCardData; initialWished?: boolean }) {
  const [wished, setWished] = useState(initialWished);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function toggleWish(e: React.MouseEvent) {
    e.preventDefault();
    setWished((w) => !w);
    await fetch("/api/wishlist", {
      method: wished ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    }).catch(() => setWished((w) => !w)); // revert on failure
  }

  async function addToCart(e: React.MouseEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      if (res.ok) { setAdded(true); setTimeout(() => setAdded(false), 1500); }
    } finally {
      setAdding(false);
    }
  }

  const hasImage = Boolean(product.images && product.images.length > 0 && product.images[0]);

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="overflow-hidden hover:-translate-y-0.5 transition h-full flex flex-col group">
        <div className="h-44 flex items-center justify-center text-4xl relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {hasImage ? (
            <img
              src={product.images![0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              loading="lazy"
            />
          ) : (
            CATEGORY_ICON[product.category?.name ?? ""] ?? "🛍️"
          )}
          <button
            onClick={toggleWish}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full border flex items-center justify-center text-xs bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm ${wished ? "text-red-500 border-red-400" : "border-slate-200 dark:border-slate-700"}`}
            aria-label="Toggle wishlist"
          >
            <Heart size={13} fill={wished ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="p-3.5 flex-1 flex flex-col">
          <div className="text-[10px] uppercase tracking-wide mb-1 text-slate-500">{product.category?.name ?? ""}</div>
          <div className="text-sm font-semibold mb-1.5 leading-snug flex-1">{product.name}</div>
          <div className="text-xs text-amber-500 mb-2 flex items-center gap-1">
            <Star size={12} fill="currentColor" /> {Number(product.rating).toFixed(1)} ({product.reviewCount})
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <b className="font-display">{money(product.price)}</b>
            <span className="text-xs line-through text-slate-500">{money(product.mrp)}</span>
          </div>
          <Button size="sm" className="w-full" onClick={addToCart} disabled={adding}>
            {added ? "Added ✓" : adding ? "Adding..." : "Add to Cart"}
          </Button>
        </div>
      </Card>
    </Link>
  );
}
