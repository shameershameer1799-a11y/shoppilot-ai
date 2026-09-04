"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  Sparkles,
  RefreshCw,
  Check,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { GrowthOpportunity } from "@/lib/ai/agents/merchant-tools";

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
  opportunities?: GrowthOpportunity[];
  campaignDraft?: {
    id: string;
    name: string;
    segment: string;
    offer: string;
    reasoning: string;
    expectedImpact: string;
    status: "draft" | "active";
  };
};

const SUGGESTIONS = [
  "How can I increase revenue this month?",
  "Create a campaign for abandoned carts",
  "Which products should I promote?",
  "Customer retention opportunities",
];

export default function AiGrowthPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "ai",
      text:
        "👋 **Welcome to the AI Merchant Growth Agent!**\n\n" +
        "I analyze your store's real database telemetry, sales funnels, and customer purchase segments to identify quantified revenue opportunities.\n\n" +
        "Ask me questions like *'How can I increase revenue?'* or click a suggestion below to diagnose your growth levers.",
    },
  ]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || thinking) return;

    setMessages((m) => [...m, { id: `usr_${Date.now()}`, role: "user", text }]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, kind: "growth" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { id: `err_${Date.now()}`, role: "ai", text: data.error || "Could not analyze growth metrics." },
        ]);
        return;
      }

      setConversationId(data.conversationId);
      setMessages((m) => [
        ...m,
        {
          id: `ai_${Date.now()}`,
          role: "ai",
          text: data.content || data.text,
          opportunities: data.opportunities,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `err_${Date.now()}`,
          role: "ai",
          text: "Couldn't reach the AI growth service. Please check your network connection and try again.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function generateDraftCampaign(opp: GrowthOpportunity, msgId: string) {
    setActionLoading(opp.id);
    try {
      const res = await fetch("/api/business/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: opp.title,
          targetSegment: opp.targetSegment,
          offer: opp.suggestedOffer,
          reasoning: opp.reasoning,
          expectedImpact: opp.potentialRevenue,
        }),
      });

      const data = await res.json();
      if (res.ok && data.campaign) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId) {
              return {
                ...m,
                campaignDraft: {
                  id: data.campaign.id,
                  name: data.campaign.name,
                  segment: data.campaign.targetSegment || opp.targetSegment,
                  offer: data.campaign.offer || opp.suggestedOffer,
                  reasoning: opp.reasoning,
                  expectedImpact: opp.potentialRevenue,
                  status: "draft",
                },
              };
            }
            return m;
          })
        );
      }
    } catch {
      // Handled silently
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApproveCampaign(campaignId: string, msgId: string) {
    setActionLoading(`approve_${campaignId}`);
    try {
      const res = await fetch("/api/business/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, action: "approve" }),
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.campaignDraft) {
              return {
                ...m,
                campaignDraft: {
                  ...m.campaignDraft,
                  status: "active",
                },
              };
            }
            return m;
          })
        );
      }
    } catch {
      // Handled silently
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display">AI Growth Agent</h1>
            <Badge className="bg-violet-100 text-violet-800 border-violet-200">
              Autonomous Growth Engine
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
              Human-in-the-Loop Gated
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Detect revenue signals, estimate financial upside, and orchestrate merchant-approved campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/business/campaigns">
            <Button variant="outline" size="sm" className="text-xs">
              All Campaigns
            </Button>
          </Link>
          <Link href="/business/audit-trail">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Agent Audit Trail
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-5" style={{ height: "calc(100vh - 210px)" }}>
        {/* Chat Feed */}
        <Card className="flex flex-col overflow-hidden shadow-sm">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="bg-violet-600 text-white text-sm px-4 py-3 rounded-2xl rounded-br-sm ml-auto max-w-[85%] shadow-sm"
                >
                  {m.text}
                </div>
              ) : (
                <div
                  key={m.id}
                  className="text-sm px-4 py-3.5 rounded-2xl rounded-bl-sm border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 max-w-[95%] space-y-4"
                >
                  <div className="whitespace-pre-line text-slate-800 dark:text-slate-200 leading-relaxed">
                    {m.text}
                  </div>

                  {/* Opportunities List */}
                  {m.opportunities && m.opportunities.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-violet-600" />
                        Identified Opportunities ({m.opportunities.length})
                      </div>

                      <div className="space-y-3">
                        {m.opportunities.map((opp) => (
                          <div
                            key={opp.id}
                            className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className="bg-violet-100 text-violet-800 text-[10px]">
                                    {opp.category}
                                  </Badge>
                                  <span className="text-[11px] font-semibold text-emerald-600">
                                    {opp.confidence}% confidence
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                  {opp.title}
                                </h4>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-slate-400 block">Est. Revenue Upside</span>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                  {opp.potentialRevenue}
                                </span>
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg text-slate-600 dark:text-slate-300">
                              <div>
                                <b className="text-slate-700 dark:text-slate-200 block mb-0.5">Signal:</b>
                                {opp.signal}
                              </div>
                              <div>
                                <b className="text-slate-700 dark:text-slate-200 block mb-0.5">Reasoning:</b>
                                {opp.reasoning}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-slate-500">
                                Target: <b>{opp.estimatedTargetAudience} customers</b> ({opp.targetSegment})
                              </span>
                              <Button
                                size="sm"
                                className="h-8 text-xs gap-1.5 font-semibold"
                                onClick={() => generateDraftCampaign(opp, m.id)}
                                disabled={actionLoading === opp.id}
                              >
                                {actionLoading === opp.id ? (
                                  <>
                                    <RefreshCw size={13} className="animate-spin" /> Drafting...
                                  </>
                                ) : (
                                  <>Generate Campaign Draft →</>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Campaign Draft & Human-in-the-Loop Gated Approval */}
                  {m.campaignDraft && (
                    <div className="mt-3 p-4 rounded-xl border-2 border-amber-400 bg-white dark:bg-slate-900 shadow-md space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-amber-600" />
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            Campaign Draft Generated
                          </span>
                        </div>
                        {m.campaignDraft.status === "active" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                            ● ACTIVE / EXECUTING
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                            PENDING MERCHANT APPROVAL
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Campaign Name:</span>
                          <b className="text-slate-800 dark:text-slate-200">{m.campaignDraft.name}</b>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Audience Segment:</span>
                          <span className="font-semibold text-violet-600">{m.campaignDraft.segment}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Proposed Offer:</span>
                          <b className="text-slate-800 dark:text-slate-200">{m.campaignDraft.offer}</b>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Estimated Revenue Uplift:</span>
                          <b className="text-emerald-600">{m.campaignDraft.expectedImpact}</b>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          <ShieldCheck size={14} className="text-emerald-600" />
                          Human-in-the-Loop Governance Gate
                        </div>
                        This action has financial and customer impact. The AI Agent will NOT launch this campaign without your explicit approval.
                      </div>

                      {m.campaignDraft.status === "active" ? (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                          <Check size={16} /> Campaign approved and launched! Action recorded in persistent audit trail.
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-1">
                          <Button
                            className="flex-1 h-9 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleApproveCampaign(m.campaignDraft!.id, m.id)}
                            disabled={actionLoading === `approve_${m.campaignDraft.id}`}
                          >
                            {actionLoading === `approve_${m.campaignDraft.id}` ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" /> Launching...
                              </>
                            ) : (
                              <>
                                <Check size={14} /> Approve &amp; Launch Campaign
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            )}

            {/* Thinking Indicator */}
            {thinking && (
              <div className="p-3 rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 text-xs flex items-center gap-2 font-mono">
                <RefreshCw size={14} className="animate-spin text-violet-600" />
                <span>Reading store telemetry &amp; analyzing growth levers...</span>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
            {SUGGESTIONS.map((s, si) => (
              <button
                key={si}
                onClick={() => send(s)}
                className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-500 hover:text-violet-600 bg-white dark:bg-slate-800 transition shrink-0"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 shrink-0">
            <input
              className="field-input text-sm"
              placeholder="Ask how to grow revenue, increase conversions, or launch campaigns..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <Button onClick={() => send()} disabled={!input.trim() || thinking} className="px-5">
              <Send size={15} />
            </Button>
          </div>
        </Card>

        {/* Sidebar Info */}
        <Card className="p-4.5 flex flex-col justify-between text-xs text-slate-500 space-y-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <b className="text-sm block text-slate-900 dark:text-slate-100 mb-1.5 font-display">
                Growth Agent Governance
              </b>
              <p className="text-[11px] leading-relaxed">
                The Merchant Growth Agent identifies high-leverage opportunities using real database telemetry:
              </p>
              <ul className="list-disc pl-4 mt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <li><b>Conversion Levers:</b> Diagnoses checkout friction and funnel drop-offs.</li>
                <li><b>Revenue Impact:</b> Estimates realistic conversion and revenue upside ranges.</li>
                <li><b>Bounded Actions:</b> Generates drafts only. Campaigns never spend money or message users without merchant approval.</li>
                <li><b>Audit Trail:</b> Every proposal and execution is recorded permanently.</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <b className="text-xs block text-slate-900 dark:text-slate-100 mb-2">
                Evaluator Test Flows
              </b>
              <div className="space-y-1.5">
                <button
                  onClick={() => send("How can I increase revenue this month?")}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-violet-50 text-[11px] text-slate-700 dark:text-slate-300 transition"
                >
                  📊 <b>Test Flow:</b> Revenue Diagnosis
                </button>
                <button
                  onClick={() => send("Create a campaign for abandoned carts")}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-violet-50 text-[11px] text-slate-700 dark:text-slate-300 transition"
                >
                  🎯 <b>Test Flow:</b> Draft &amp; Approval Flow
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
            Razorpay AI Buildathon 2026 · AI Growth &amp; Agentic Commerce Track
          </div>
        </Card>
      </div>
    </div>
  );
}
