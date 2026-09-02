import { notFound } from "next/navigation";
import { getDb, isDbConfigured } from "@/lib/db";
import { schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { CATEGORY_ICON, money } from "@/lib/utils";
import { AddToCartButton } from "@/components/customer/AddToCartButton";
import { Star } from "lucide-react";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return <Card className="p-6 text-sm text-amber-700 bg-amber-50 border-amber-200">Database not configured — set DATABASE_URL to view product details.</Card>;
  }

  const db = getDb();
  const product = await db.query.products.findFirst({
    where: eq(schema.products.id, params.id),
    with: { category: true, reviews: { limit: 10 } },
  });
  if (!product) notFound();

  const hasImage = Boolean(product.images && product.images.length > 0 && product.images[0]);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card className="h-80 md:h-96 flex items-center justify-center text-8xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
        {hasImage ? (
          <img
            src={product.images![0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          CATEGORY_ICON[product.category?.name ?? ""] ?? "🛍️"
        )}
      </Card>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">{product.category?.name}</div>
        <h1 className="text-2xl font-bold mb-2 font-display">{product.name}</h1>
        <div className="flex items-center gap-1 text-amber-500 text-sm mb-4">
          <Star size={14} fill="currentColor" /> {Number(product.rating).toFixed(1)} ({product.reviewCount} reviews)
        </div>
        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-3xl font-bold font-display">{money(product.price)}</span>
          <span className="text-base line-through text-slate-500">{money(product.mrp)}</span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">{product.description || "No description provided."}</p>

        {Object.keys(product.specifications ?? {}).length > 0 && (
          <Card className="p-4 mb-6">
            <h3 className="font-semibold text-sm mb-2">Specifications</h3>
            <dl className="text-sm space-y-1.5">
              {Object.entries(product.specifications as Record<string, string>).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        <div className="flex gap-3">
          <AddToCartButton productId={product.id} inStock={product.stock > 0} />
        </div>
        {product.stock < 15 && product.stock > 0 && (
          <p className="text-xs text-amber-600 mt-2">Only {product.stock} left in stock.</p>
        )}
        {product.stock === 0 && <p className="text-xs text-red-600 mt-2">Out of stock.</p>}
      </div>

      {product.reviews.length > 0 && (
        <div className="md:col-span-2">
          <h3 className="font-semibold mb-3">Reviews</h3>
          <div className="space-y-3">
            {product.reviews.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center gap-1 text-amber-500 text-xs mb-1.5">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
