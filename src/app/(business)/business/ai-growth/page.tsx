"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OpportunityCard } from "@/components/business/OpportunityCard";
import type { GrowthOpportunity } from "@/lib/ai/service";

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "ai"; text: string; opportunities?: GrowthOpportunity[] };

const SUGGESTIONS = ["Why did sales decrease?", "Which customers are at risk?", "Create a campaign for abandoned carts"];

export default function AiGrowthPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "Hi! Ask me why a metric moved, or what to do next." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
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
        body: JSON.stringify({ message: text, conversationId, kind: "growth" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "ai", text: data.error || "Something went wrong." }]);
        return;
      }
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "ai", text: data.content, opportunities: data.opportunities }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Couldn't reach the AI service. Check your connection and try again." }]);
    } finally {
      setThinking(false);
    }
  }

  async function generateCampaign(o: GrowthOpportunity) {
    await fetch("/api/business/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: o.title, offer: "10% off", targetSegment: "cart_abandoner" }),
    });
    setMessages((m) => [...m, { role: "ai", text: `Draft campaign "${o.title}" created — find it under Campaigns.` }]);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">AI Growth Assistant</h1>
      <p className="text-sm mb-5 text-slate-500">Ask about sales, customers, or growth opportunities</p>
      <div className="grid lg:grid-cols-[1fr_300px] gap-5" style={{ height: "calc(100vh - 220px)" }}>
        <Card className="flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="bg-violet-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm ml-auto w-fit" style={{ maxWidth: "85%" }}>{m.text}</div>
              ) : (
                <div key={i} className="text-sm px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950" style={{ maxWidth: "95%" }}>
                  {m.text}
                  {m.opportunities?.map((o, j) => <OpportunityCard key={j} o={o} onAction={() => generateCampaign(o)} />)}
                </div>
              )
            )}
            {thinking && (
              <div className="text-teal-500 text-xs space-y-1 font-mono">
                <div className="flex items-center gap-1.5"><Check size={12} /> Reading analytics</div>
                <div className="flex items-center gap-1.5"><Check size={12} /> Ranking opportunities</div>
              </div>
            )}
          </div>
          <div className="flex gap-2 px-5 pb-3 flex-wrap">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-violet-500 hover:text-violet-600">{s}</button>
            ))}
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 p-3.5 flex gap-2.5">
            <input className="field-input" placeholder="e.g. How can I increase sales?" value={input}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <Button onClick={() => send()}><Send size={15} /></Button>
          </div>
        </Card>
        <Card className="p-4.5 text-sm leading-relaxed text-slate-500" style={{ padding: "18px" }}>
          <b className="block mb-2 text-slate-900 dark:text-slate-50">This analyst reads</b>
          Revenue trends, cart abandonment, customer segments and product performance to suggest ranked, actionable opportunities.
        </Card>
      </div>
    </div>
  );
}
