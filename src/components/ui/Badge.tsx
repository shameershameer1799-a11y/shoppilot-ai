import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", className)} {...props} />;
}

export function segmentBadgeClass(seg: string) {
  if (seg === "vip" || seg === "new") return "bg-violet-100 text-violet-700";
  if (seg === "loyal") return "bg-teal-100 text-teal-700";
  if (seg === "high_intent") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}
