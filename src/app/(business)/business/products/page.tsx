import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { money } from "@/lib/utils";

export default async function BusinessProductsPage() {
  const user = await getCurrentUser();
  if (!user || user.accountType !== "business") redirect("/login");

  let products: any[] = [];
  if (isDbConfigured()) {
    const db = getDb();
    const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
    if (business) products = await db.query.products.findMany({ where: eq(schema.products.businessId, business.id), with: { category: true } });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Products</h1>
      <p className="text-sm mb-5 text-slate-500">{products.length} products in catalog</p>
      <Card className="overflow-x-auto">
        {products.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No products yet. Use <code>POST /api/products</code> to add your first one, or run the seed script.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3.5">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th>
            </tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                  <td className="p-3.5">{p.name}</td>
                  <td>{p.category?.name}</td>
                  <td>{money(p.price)}</td>
                  <td>{p.stock < 15 ? <Badge className="bg-amber-100 text-amber-700">{p.stock} low</Badge> : p.stock}</td>
                  <td>★ {Number(p.rating).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
