import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl", className)} {...props} />;
}
