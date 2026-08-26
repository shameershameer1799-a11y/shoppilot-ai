"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

const CONTEXT_MESSAGES: Record<string, string> = {
  "/shop": "Looking for something specific? Tell me your budget or use case and I'll narrow the catalog down.",
  "/cart": "Want me to check if there's a cheaper alternative for anything in your cart?",
  "/orders": "I can tell you the live status of any order — just give me the order number.",
  "/dashboard": "I can break down what's driving your revenue this week, or find your next growth opportunity.",
  "/business/dashboard": "I can break down what's driving your revenue this week, or find your next growth opportunity.",
};

export function FloatingAssistant({ role }: { role: "customer" | "business" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const message = CONTEXT_MESSAGES[pathname] ?? "Ask me anything about this screen.";
  const linkTo = role === "business" ? "/business/ai-growth" : "/ai-shop";

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-xl z-50"
        style={{ background: "linear-gradient(135deg,#7c3aed,#14b8a6)" }}
        aria-label="Ask ShopPilot"
      >
        <MessageCircle size={22} />
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 w-80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden bg-white dark:bg-slate-900">
          <div className="px-4 py-3 text-white text-sm font-semibold" style={{ background: "linear-gradient(135deg,#7c3aed,#8b5cf6)" }}>
            Ask ShopPilot ✨
          </div>
          <div className="p-4 text-sm leading-relaxed max-h-64 overflow-y-auto text-slate-500">
            {message}
            <a href={linkTo} className="block mt-3 text-violet-600 font-semibold text-xs">Open full assistant →</a>
          </div>
        </div>
      )}
    </>
  );
}
