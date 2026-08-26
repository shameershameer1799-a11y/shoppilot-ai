import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OrderTracker } from "@/components/customer/OrderTracker";
import { money } from "@/lib/utils";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let orders: any[] = [];
  if (isDbConfigured()) {
    const db = getDb();
    orders = await db.query.orders.findMany({
      where: eq(schema.orders.userId, user.id),
      orderBy: desc(schema.orders.createdAt),
      with: { items: true },
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Your Orders</h1>
      <p className="text-sm mb-5 text-slate-500">{orders.length} order(s)</p>
      {orders.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-500">
          No orders yet. <Link href="/shop" className="text-violet-600 font-semibold">Start shopping →</Link>
        </Card>
      )}
      {orders.map((o) => (
        <Card key={o.id} className="p-5 mb-3.5">
          <div className="flex justify-between items-center">
            <Link href={`/orders/${o.id}`} className="hover:text-violet-600"><b>#{o.orderNumber}</b></Link>
            <Badge className={o.status === "delivered" ? "bg-teal-100 text-teal-700" : "bg-violet-100 text-violet-700"}>
              {o.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="text-sm mt-1.5 text-slate-500">
            {o.items.map((i: any) => `${i.productName} × ${i.quantity}`).join(", ")} — {money(o.total)}
          </div>
          <OrderTracker status={o.status} />
        </Card>
      ))}
    </div>
  );
}
