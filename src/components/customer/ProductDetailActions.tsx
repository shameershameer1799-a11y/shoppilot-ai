"use client";

import { useState } from "react";
import { Heart, Minus, Plus, ShoppingBag, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ProductDetailActionsProps {
  productId: string;
  stock: number;
  initialWished?: boolean;
}

export function ProductDetailActions({ productId, stock, initialWished = false }: ProductDetailActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const [wished, setWished] = useState(initialWished);
  const [wishLoading, setWishLoading] = useState(false);
  const [cartState, setCartState] = useState<"idle" | "adding" | "added" | "error">("idle");
  const inStock = stock > 0;
  const maxQuantity = Math.min(Math.max(1, stock), 10);

  function increment() {
    setQuantity((q) => Math.min(q + 1, maxQuantity));
  }

  function decrement() {
    setQuantity((q) => Math.max(q - 1, 1));
  }

  async function handleAddToCart() {
    if (!inStock || cartState === "adding") return;
    setCartState("adding");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      if (res.ok) {
        setCartState("added");
        setTimeout(() => setCartState("idle"), 2000);
      } else {
        setCartState("error");
        setTimeout(() => setCartState("idle"), 2500);
      }
    } catch {
      setCartState("error");
      setTimeout(() => setCartState("idle"), 2500);
    }
  }

  async function toggleWishlist() {
    if (wishLoading) return;
    const nextWished = !wished;
    setWished(nextWished);
    setWishLoading(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: nextWished ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        setWished(!nextWished); // revert
      }
    } catch {
      setWished(!nextWished); // revert
    } finally {
      setWishLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Quantity & Actions Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Quantity Controls */}
        {inStock && (
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden h-11">
            <button
              type="button"
              onClick={decrement}
              disabled={quantity <= 1}
              className="px-3 h-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 transition"
              aria-label="Decrease quantity"
            >
              <Minus size={15} />
            </button>
            <span className="px-3 text-sm font-semibold font-mono w-8 text-center select-none">
              {quantity}
            </span>
            <button
              type="button"
              onClick={increment}
              disabled={quantity >= maxQuantity}
              className="px-3 h-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 transition"
              aria-label="Increase quantity"
            >
              <Plus size={15} />
            </button>
          </div>
        )}

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          disabled={!inStock || cartState === "adding"}
          className={`flex-1 h-11 text-sm font-semibold flex items-center justify-center gap-2 transition ${
            cartState === "added"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : cartState === "error"
              ? "bg-rose-600 hover:bg-rose-700 text-white"
              : ""
          }`}
        >
          {cartState === "adding" ? (
            "Adding to Cart..."
          ) : cartState === "added" ? (
            <>
              <Check size={16} /> Added {quantity > 1 ? `(${quantity})` : ""} to Cart!
            </>
          ) : cartState === "error" ? (
            <>
              <AlertCircle size={16} /> Failed to add
            </>
          ) : !inStock ? (
            "Out of Stock"
          ) : (
            <>
              <ShoppingBag size={16} /> Add to Cart {quantity > 1 ? `(${quantity})` : ""}
            </>
          )}
        </Button>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={toggleWishlist}
          disabled={wishLoading}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={`h-11 px-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition ${
            wished
              ? "bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400"
              : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          }`}
        >
          <Heart size={18} fill={wished ? "currentColor" : "none"} className={wished ? "text-rose-600 dark:text-rose-400" : ""} />
          <span className="hidden sm:inline">{wished ? "Saved" : "Wishlist"}</span>
        </button>
      </div>

      {/* Stock message */}
      {inStock && stock < 15 && (
        <p className="text-xs text-amber-600 font-medium">⚡ Only {stock} items left in stock — order soon!</p>
      )}
      {!inStock && (
        <p className="text-xs text-rose-600 font-medium">Currently unavailable. Check back soon.</p>
      )}
    </div>
  );
}
