"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const STATUS_COLOR: Record<string, string> = {
  active: "bg-teal-100 text-teal-700", scheduled: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-600", completed: "bg-violet-100 text-violet-700",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/business/campaigns");
    const data = await res.json();
    setCampaigns(data.campaigns ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createCampaign() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/business/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetSegment: "cart_abandoner", offer: "10% off" }),
      });
      setName("");
      load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Campaigns</h1>
      <p className="text-sm mb-5 text-slate-500">Active and past campaigns</p>

      <Card className="p-4 mb-5 flex gap-2.5">
        <input className="field-input" placeholder="New campaign name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={createCampaign} disabled={creating || !name.trim()}>{creating ? "Creating..." : "Create Campaign"}</Button>
      </Card>

      {loading ? (
        <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ) : campaigns.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">No campaigns yet — create one above, or generate one from an AI Growth opportunity.</Card>
      ) : campaigns.map((c) => (
        <Card key={c.id} className="p-5 mb-3.5" style={{ borderLeft: "4px solid #14b8a6" }}>
          <div className="flex justify-between mb-2">
            <h4 className="font-semibold">{c.name}</h4>
            <Badge className={STATUS_COLOR[c.status] ?? STATUS_COLOR.draft}>{c.status}</Badge>
          </div>
          <div className="flex gap-5 text-xs text-slate-500">
            <span>Sent: {c.sentCount ?? 0}</span>
            <span>Recovered: ₹{Number(c.recoveredRevenue ?? 0).toLocaleString("en-IN")}</span>
            <span>Conv: {c.conversionRate ?? 0}%</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
