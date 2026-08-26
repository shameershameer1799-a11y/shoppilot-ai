import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OrderTracker } from "@/components/customer/OrderTracker";
import { money } from "@/lib/utils";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, params.id), with: { items: true } });
  if (!order || order.userId !== user.id) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1 font-display">Order #{order.orderNumber}</h1>
      <p className="text-sm mb-5 text-slate-500">Placed {new Date(order.createdAt).toLocaleDateString()}</p>
      <Card className="p-5 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm">Status</span>
          <Badge className="bg-violet-100 text-violet-700">{order.status.replace(/_/g, " ")}</Badge>
        </div>
        <OrderTracker status={order.status} />
      </Card>
      <Card className="p-5 mb-5">
        <h3 className="font-semibold text-sm mb-3">Items</h3>
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
            <span>{i.productName} × {i.quantity}</span><span>{money(Number(i.price) * i.quantity)}</span>
          </div>
        ))}
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Delivery</h3>
        <p className="text-sm text-slate-500">{order.addressLine}, {order.city} {order.pincode}</p>
        <p className="text-sm text-slate-500">{order.phone}</p>
        <div className="flex justify-between text-base font-bold mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
          <span>Total</span><span>{money(order.total)}</span>
        </div>
        {order.isMockPayment && <p className="text-xs text-amber-600 mt-2">Paid via mock payment processing (demo mode).</p>}
      </Card>
    </div>
  );
}
