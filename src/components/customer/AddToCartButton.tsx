"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function AddToCartButton({ productId, inStock }: { productId: string; inStock: boolean }) {
  const [state, setState] = useState<"idle" | "adding" | "added" | "error">("idle");

  async function handleClick() {
    setState("adding");
    try {
      const res = await fetch("/api/cart", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      setState(res.ok ? "added" : "error");
      if (res.ok) setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
    }
  }

  return (
    <Button onClick={handleClick} disabled={!inStock || state === "adding"}>
      {!inStock ? "Out of Stock" : state === "adding" ? "Adding..." : state === "added" ? "Added ✓" : state === "error" ? "Try again" : "Add to Cart"}
    </Button>
  );
}
