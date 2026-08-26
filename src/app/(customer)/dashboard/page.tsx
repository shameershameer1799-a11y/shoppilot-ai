import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProductGrid } from "@/components/customer/ProductGrid";
import { CATEGORY_ICON, money } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let recommended: any[] = [];
  let recentlyViewed: any[] = [];

  if (isDbConfigured()) {
    const db = getDb();
    recommended = await db.query.products.findMany({ with: { category: true }, limit: 4, orderBy: desc(schema.products.rating) });
    const recentEvents = await db.query.analyticsEvents.findMany({
      where: eq(schema.analyticsEvents.userId, user.id),
      orderBy: desc(schema.analyticsEvents.createdAt),
      limit: 3,
      with: { product: true },
    }).catch(() => []);
    recentlyViewed = recentEvents.filter((e: any) => e.product).map((e: any) => e.product);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Welcome back, {user.fullName} 👋</h1>
      <p className="text-sm mb-6 text-slate-500">Here&apos;s what&apos;s happening with your shopping today.</p>

      {!isDbConfigured() && (
        <Card className="p-4 mb-5 bg-amber-50 border-amber-200 text-amber-800 text-sm">
          Running without a database connection — set <code>DATABASE_URL</code> to see real product data here.
        </Card>
      )}

      <Card className="p-5 mb-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-sm">Recommended for you</h3>
          <Badge className="bg-violet-100 text-violet-700">AI powered</Badge>
        </div>
        <ProductGrid products={recommended} />
      </Card>

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Recently viewed</h3>
          {recentlyViewed.length === 0 ? (
            <p className="text-sm text-slate-500">Browse the shop and we&apos;ll start tracking your recent views here.</p>
          ) : recentlyViewed.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-slate-200 dark:border-slate-700 last:border-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base bg-slate-100 dark:bg-slate-800">{CATEGORY_ICON[p.category?.name] ?? "🛍️"}</div>
              <div><div className="text-sm font-medium">{p.name}</div><div className="text-xs text-slate-500">{money(p.price)}</div></div>
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">AI Insight</h3>
          <p className="text-sm leading-relaxed text-slate-500">
            Tell the AI Shopping Agent your budget and use case, and it&apos;ll rank the catalog for you with a transparent match score.
          </p>
          <Link href="/ai-shop" className="btn-primary inline-flex mt-3">Ask AI to compare</Link>
        </Card>
      </div>
    </div>
  );
}
