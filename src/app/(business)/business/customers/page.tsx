import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge, segmentBadgeClass } from "@/components/ui/Badge";
import { money } from "@/lib/utils";

export default async function BusinessCustomersPage() {
  const user = await getCurrentUser();
  if (!user || user.accountType !== "business") redirect("/login");

  let customers: any[] = [];
  if (isDbConfigured()) {
    const db = getDb();
    const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
    if (business) {
      customers = await db.query.customers.findMany({
        where: eq(schema.customers.businessId, business.id),
        orderBy: desc(schema.customers.aiScore),
        with: { segments: { limit: 1, orderBy: desc(schema.customerSegments.assignedAt) } },
      });
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Customers</h1>
      <p className="text-sm mb-5 text-slate-500">{customers.length} tracked customers with AI scoring</p>
      <Card className="overflow-x-auto">
        {customers.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No customer records yet — these populate as orders and analytics events accumulate.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3.5">Customer</th><th>AI Score</th><th>Segment</th><th>Lifetime Spend</th>
            </tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                  <td className="p-3.5">{c.displayName}</td>
                  <td>{c.aiScore}/100</td>
                  <td>{c.segments[0] && <Badge className={segmentBadgeClass(c.segments[0].segment)}>{c.segments[0].segment.replace(/_/g, " ")}</Badge>}</td>
                  <td>{money(c.lifetimeSpend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
