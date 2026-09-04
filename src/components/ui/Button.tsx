import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "white" | "outline";
  size?: "sm" | "md";
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  const sizes = { md: "px-4 py-2.5 text-sm", sm: "px-3 py-1.5 text-xs" };
  const variants = {
    primary: "bg-violet-600 text-white hover:bg-violet-700",
    ghost: "border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 hover:border-violet-500 hover:text-violet-600 bg-transparent",
    outline: "border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 hover:border-violet-500 hover:text-violet-600 bg-transparent",
    white: "bg-white text-violet-600 hover:bg-slate-100",
  };
  return (
    <button
      className={cn(
        "rounded-xl font-semibold transition inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        sizes[size], variants[variant], className
      )}
      {...props}
    />
  );
}
