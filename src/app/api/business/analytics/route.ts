import { NextResponse } from "next/server";
import { requireBusinessUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { eq, and, gte, sql, count } from "drizzle-orm";
import { subDays } from "date-fns";

export async function GET() {
  const user = await requireBusinessUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
  if (!business) return NextResponse.json({ error: "No business profile found" }, { status: 400 });

  const since30 = subDays(new Date(), 30);

  const [productList, orderRows, funnelRows] = await Promise.all([
    db.query.products.findMany({ where: eq(schema.products.businessId, business.id) }),
    db.query.orders.findMany({ where: gte(schema.orders.createdAt, since30) }), // demo scope: all orders in period
    db.select({ eventType: schema.analyticsEvents.eventType, c: count() })
      .from(schema.analyticsEvents)
      .where(and(eq(schema.analyticsEvents.businessId, business.id), gte(schema.analyticsEvents.createdAt, since30)))
      .groupBy(schema.analyticsEvents.eventType),
  ]);

  const revenue = orderRows.reduce((s, o) => s + Number(o.total), 0);
  const orderCount = orderRows.length;
  const avgOrderValue = orderCount ? Math.round(revenue / orderCount) : 0;

  const funnel: Record<string, number> = {};
  for (const row of funnelRows) funnel[row.eventType] = row.c;

  return NextResponse.json({
    kpis: {
      revenue, orders: orderCount, avgOrderValue,
      conversionRate: funnel.page_view ? Number(((orderCount / funnel.page_view) * 100).toFixed(1)) : 0,
    },
    funnel,
    productCount: productList.length,
    lowStockCount: productList.filter((p) => p.stock < 15).length,
  });
}
