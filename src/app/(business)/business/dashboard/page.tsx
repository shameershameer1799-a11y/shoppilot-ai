import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/business/KpiCard";
import { RevenueLineChart, SplitPieChart } from "@/components/business/Charts";
import { CATEGORY_ICON, money } from "@/lib/utils";

export default async function BusinessDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.accountType !== "business") redirect("/login");

  let topProducts: any[] = [];
  let storeName = `${user.fullName}'s Store`;

  if (isDbConfigured()) {
    const db = getDb();
    const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
    if (business) {
      storeName = business.storeName;
      topProducts = await db.query.products.findMany({
        where: eq(schema.products.businessId, business.id),
        orderBy: desc(schema.products.reviewCount),
        limit: 4,
      });
    }
  }

  // Demo trend data — a real deployment would derive this from analytics_events over time.
  const revenueTrend = [
    { name: "W1", value: 62 }, { name: "W2", value: 71 }, { name: "W3", value: 68 },
    { name: "W4", value: 84 }, { name: "W5", value: 79 }, { name: "W6", value: 94 },
  ];
  const categorySplit = [
    { name: "Laptops", value: 32 }, { name: "Phones", value: 28 }, { name: "Headphones", value: 25 }, { name: "Other", value: 15 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Business Dashboard</h1>
      <p className="text-sm mb-5 text-slate-500">Welcome back — here&apos;s how {storeName} is doing</p>

      {!isDbConfigured() && (
        <Card className="p-4 mb-5 bg-amber-50 border-amber-200 text-amber-800 text-sm">
          Running without a database connection — set <code>DATABASE_URL</code> to see real analytics here.
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Revenue (30d)" value="₹8.4L" delta="12.3%" up />
        <KpiCard label="Orders" value="1,284" delta="8.1%" up />
        <KpiCard label="Conversion Rate" value="3.6%" delta="0.4%" up={false} />
        <KpiCard label="Avg. Order Value" value="₹2,940" delta="5.0%" up />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card className="p-5"><h3 className="font-semibold text-sm mb-3">Revenue trend</h3><RevenueLineChart data={revenueTrend} /></Card>
        <Card className="p-5"><h3 className="font-semibold text-sm mb-3">Orders by category</h3><SplitPieChart data={categorySplit} /></Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Top performing products</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-slate-500">Add products to see performance data here.</p>
        ) : topProducts.map((p) => (
          <div key={p.id} className="flex justify-between text-sm py-2.5 border-b border-slate-200 dark:border-slate-700 last:border-0">
            <span>🛍️ {p.name}</span><span className="text-slate-500">{p.reviewCount} reviews</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
