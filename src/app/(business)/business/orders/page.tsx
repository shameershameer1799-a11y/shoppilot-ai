import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { money } from "@/lib/utils";

export default async function BusinessOrdersPage() {
  const user = await getCurrentUser();
  if (!user || user.accountType !== "business") redirect("/login");

  let orders: any[] = [];
  if (isDbConfigured()) {
    const db = getDb();
    // Demo scope: shows all orders platform-wide. A multi-tenant deployment
    // would join through order_items -> products.business_id to scope this.
    orders = await db.query.orders.findMany({ orderBy: desc(schema.orders.createdAt), limit: 30, with: { items: true, user: true } });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Orders</h1>
      <p className="text-sm mb-5 text-slate-500">Recent orders across your store</p>
      {orders.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">No orders yet.</Card>
      ) : orders.map((o) => (
        <Card key={o.id} className="p-4 mb-3" style={{ padding: "16px 20px" }}>
          <div className="flex justify-between"><b>#{o.orderNumber}</b><Badge className="bg-violet-100 text-violet-700">{o.status.replace(/_/g, " ")}</Badge></div>
          <div className="text-sm mt-1.5 text-slate-500">{o.user?.fullName} · {o.items.map((i: any) => i.productName).join(", ")} · {money(o.total)}</div>
        </Card>
      ))}
    </div>
  );
}
