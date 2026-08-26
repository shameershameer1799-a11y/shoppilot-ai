import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return "₹" + n.toLocaleString("en-IN");
}

export function generateOrderNumber(): string {
  return "SP" + Math.floor(10000 + Math.random() * 89999);
}

export const CATEGORY_ICON: Record<string, string> = {
  Laptops: "💻", Smartphones: "📱", Headphones: "🎧", Watches: "⌚",
  Shoes: "👟", Cameras: "📷", Backpacks: "🎒", Accessories: "🔌",
};

export const ORDER_STAGES = ["ordered", "processing", "shipped", "out_for_delivery", "delivered"] as const;
