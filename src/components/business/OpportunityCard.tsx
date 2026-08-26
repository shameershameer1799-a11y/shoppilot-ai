import { Badge } from "@/components/ui/Badge";
import type { GrowthOpportunity } from "@/lib/ai/service";

export function OpportunityCard({ o, onAction }: { o: GrowthOpportunity; onAction?: () => void }) {
  const badgeColor = o.impact === "high" ? "bg-teal-100 text-teal-700" : o.impact === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 mt-2.5" style={{ borderLeft: "4px solid #14b8a6" }}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm">{o.title}</h4>
        <Badge className={badgeColor}>{o.impact} impact</Badge>
      </div>
      <div className="flex gap-4 text-xs mb-3 text-slate-500">
        <span>Potential Revenue: {o.potentialRevenue}</span><span>Effort: {o.effort}</span>
      </div>
      <button onClick={onAction} className="btn-primary !px-3 !py-1.5 !text-xs">{o.action}</button>
    </div>
  );
}
