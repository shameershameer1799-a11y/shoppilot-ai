"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Check, Sparkles, RefreshCw, Megaphone, ArrowRight } from "lucide-react";
import { money } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  scheduled: "bg-amber-100 text-amber-800 border-amber-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  completed: "bg-violet-100 text-violet-800 border-violet-200",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/business/campaigns");
    const data = await res.json();
    setCampaigns(data.campaigns ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCampaign() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/business/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetSegment: "cart_abandoner",
          offer: "10% off",
          reasoning: "Manual merchant campaign creation",
        }),
      });
      setName("");
      load();
    } finally {
      setCreating(false);
    }
  }

  async function approveCampaign(campaignId: string) {
    setActionLoading(campaignId);
    try {
      const res = await fetch("/api/business/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, action: "approve" }),
      });
      if (res.ok) {
        await load();
      }
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Campaigns</h1>
          <p className="text-xs text-slate-500 mt-1">
            Orchestrated customer reactivation and cross-sell marketing campaigns
          </p>
        </div>
        <Link href="/business/ai-growth">
          <Button size="sm" className="gap-1.5 text-xs font-semibold">
            <Sparkles size={14} /> Generate with AI Growth Agent →
          </Button>
        </Link>
      </div>

      <Card className="p-4 flex gap-2.5 shadow-sm">
        <input
          className="field-input text-xs"
          placeholder="New campaign name (e.g. VIP Early Access)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={createCampaign} disabled={creating || !name.trim()} className="text-xs shrink-0">
          {creating ? "Creating..." : "Create Draft"}
        </Button>
      </Card>

      {loading ? (
        <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ) : campaigns.length === 0 ? (
        <Card className="p-8 text-center text-xs text-slate-500">
          No campaigns found. Use the input above to create a draft, or ask the{" "}
          <Link href="/business/ai-growth" className="text-violet-600 font-semibold underline">
            AI Growth Assistant
          </Link>{" "}
          to generate one automatically.
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const isDraft = c.status === "draft";
            return (
              <Card
                key={c.id}
                className="p-4 shadow-sm border-l-4"
                style={{ borderLeftColor: isDraft ? "#f59e0b" : "#10b981" }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{c.name}</h4>
                    <Badge className={STATUS_COLOR[c.status] ?? STATUS_COLOR.draft}>
                      {c.status.toUpperCase()}
                    </Badge>
                  </div>
                  {isDraft && (
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto"
                      onClick={() => approveCampaign(c.id)}
                      disabled={actionLoading === c.id}
                    >
                      {actionLoading === c.id ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" /> Launching...
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Approve &amp; Launch
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="grid sm:grid-cols-4 gap-3 text-xs text-slate-500 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Target Audience</span>
                    <span className="font-semibold text-violet-600 capitalize">
                      {c.targetSegment ? c.targetSegment.replace(/_/g, " ") : "All Customers"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Offer Incentive</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {c.offer || "Special Pricing"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Dispatched Audience</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {c.sentCount || 0} customers
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Recovered Revenue</span>
                    <span className="font-bold text-emerald-600">
                      {money(Number(c.recoveredRevenue || 0))}
                    </span>
                  </div>
                </div>

                {c.reasoning && (
                  <p className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    💡 <b>AI Reasoning:</b> {c.reasoning}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
