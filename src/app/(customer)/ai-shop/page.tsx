"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MatchRing } from "@/components/ui/MatchRing";
import { money } from "@/lib/utils";
import type { ProductMatch } from "@/types";

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "ai"; text: string; matches?: ProductMatch[] };

const SUGGESTIONS = ["Find a laptop under ₹80,000", "Best headphones for gaming", "Find the best value smartphone"];

export default function AiShopPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "Hi! Tell me what you're looking for — a category, a budget, or a use case." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, kind: "shopping" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "ai", text: data.error || "Something went wrong. Please try again." }]);
        return;
      }
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "ai", text: data.content, matches: data.matches }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Couldn't reach the AI service. Check your connection and try again." }]);
    } finally {
      setThinking(false);
    }
  }

  async function addToCart(productId: string) {
    const res = await fetch("/api/cart", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    if (res.ok) setAddedIds((ids) => [...ids, productId]);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">AI Shopping Agent</h1>
      <p className="text-sm mb-5 text-slate-500">Ask in plain language — budget, use case, or preferences</p>
      <div className="grid lg:grid-cols-[1fr_300px] gap-5" style={{ height: "calc(100vh - 220px)" }}>
        <Card className="flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="bg-violet-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm ml-auto w-fit" style={{ maxWidth: "85%" }}>{m.text}</div>
              ) : (
                <div key={i} className="text-sm px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950" style={{ maxWidth: "95%" }}>
                  {m.text}
                  {m.matches?.map((p) => (
                    <div key={p.id} className="mt-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center gap-3">
                      <MatchRing score={p.score} />
                      <div className="flex-1 min-w-0">
                        <b className="text-sm block">
                          <Link href={`/products/${p.id}`} className="hover:text-violet-600">{p.name}</Link> — {money(p.price)}
                        </b>
                        <span className="text-xs text-slate-500">{p.reasons.map((r) => "✓ " + r).join("   ")}</span>
                      </div>
                      <Button size="sm" className="shrink-0" onClick={() => addToCart(p.id)} disabled={addedIds.includes(p.id)}>
                        {addedIds.includes(p.id) ? "Added ✓" : "Add"}
                      </Button>
                    </div>
                  ))}
                </div>
              )
            )}
            {thinking && (
              <div className="text-teal-500 text-xs space-y-1 font-mono">
                <div className="flex items-center gap-1.5"><Check size={12} /> Understanding requirements</div>
                <div className="flex items-center gap-1.5"><Check size={12} /> Searching products</div>
                <div className="flex items-center gap-1.5"><Check size={12} /> Ranking matches</div>
              </div>
            )}
          </div>
          <div className="flex gap-2 px-5 pb-3 flex-wrap">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-violet-500 hover:text-violet-600">{s}</button>
            ))}
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 p-3.5 flex gap-2.5">
            <input className="field-input" placeholder="e.g. Find a camera under ₹25,000 for travel" value={input}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <Button onClick={() => send()}><Send size={15} /></Button>
          </div>
        </Card>
        <Card className="p-4.5 text-sm leading-relaxed text-slate-500" style={{ padding: "18px" }}>
          <b className="block mb-2 text-slate-900 dark:text-slate-50">How this works</b>
          The AI parses your budget and category, searches the catalog, ranks results by fit, rating and value, then explains each match with a confidence score.
          <br /><br />
          <b className="block mb-2 text-slate-900 dark:text-slate-50">Try asking</b>
          &quot;Compare these products&quot; · &quot;Find a cheaper alternative&quot; · &quot;Recommend something based on my preferences&quot;
        </Card>
      </div>
    </div>
  );
}
