import type { GrowthOpportunity } from "./service";

/** Maps a stored ai_insights row into the shape OpportunityCard expects. */
export function toOpportunityView(i: {
  title: string; impact: string | null; effort: string | null; potentialRevenue: string | null;
}): GrowthOpportunity {
  return {
    title: i.title,
    impact: (i.impact as GrowthOpportunity["impact"]) ?? "medium",
    effort: (i.effort as GrowthOpportunity["effort"]) ?? "medium",
    potentialRevenue: i.potentialRevenue ? `₹${Number(i.potentialRevenue).toLocaleString("en-IN")}` : "—",
    action: "Generate Campaign",
  };
}
