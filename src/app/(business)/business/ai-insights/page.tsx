import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { OpportunityCard } from "@/components/business/OpportunityCard";
import { toOpportunityView } from "@/lib/ai/view";

export default async function AiInsightsPage() {
  const user = await getCurrentUser();
  if (!user || user.accountType !== "business") redirect("/login");

  let insights: any[] = [];
  if (isDbConfigured()) {
    const db = getDb();
    const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
    if (business) insights = await db.query.aiInsights.findMany({ where: eq(schema.aiInsights.businessId, business.id), orderBy: desc(schema.aiInsights.createdAt) });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">AI Insights</h1>
      <p className="text-sm mb-5 text-slate-500">Stored opportunities surfaced by the growth analyst</p>
      {insights.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          No insights stored yet — ask the <a href="/business/ai-growth" className="text-violet-600 font-semibold">AI Growth Assistant</a> a question to generate some.
        </Card>
      ) : insights.map((i) => <OpportunityCard key={i.id} o={toOpportunityView(i)} />)}
    </div>
  );
}
