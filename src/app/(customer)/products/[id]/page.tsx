import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb, isDbConfigured } from "@/lib/db";
import { schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CATEGORY_ICON, money } from "@/lib/utils";
import { ProductDetailActions } from "@/components/customer/ProductDetailActions";
import { Star, ChevronRight, CheckCircle2, ShieldCheck, Truck, RotateCcw, MessageSquare } from "lucide-react";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return (
      <Card className="p-6 text-sm text-amber-700 bg-amber-50 border-amber-200">
        Database not configured — set DATABASE_URL to view product details.
      </Card>
    );
  }

  // Validate UUID format before DB query to avoid Postgres uuid syntax error
  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
  if (!isValidUuid) {
    notFound();
  }

  const db = getDb();
  let product: any = null;

  try {
    product = await db.query.products.findFirst({
      where: eq(schema.products.id, params.id),
      with: {
        category: true,
        reviews: {
          with: { user: true },
          limit: 20,
        },
      },
    });
  } catch (err) {
    console.error("Error querying product details:", err);
    // Fallback without reviews relation if any DB anomaly
    product = await db.query.products.findFirst({
      where: eq(schema.products.id, params.id),
      with: { category: true },
    }).catch(() => null);
  }

  if (!product) {
    notFound();
  }

  const hasImage = Boolean(product.images && product.images.length > 0 && product.images[0]);
  const priceNum = Number(product.price);
  const mrpNum = Number(product.mrp);
  const discountPercent = mrpNum > priceNum ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0;
  const ratingNum = Number(product.rating || 0);
  const reviewsList = product.reviews ?? [];
  const inStock = product.stock > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 font-medium">
        <Link href="/shop" className="hover:text-violet-600 transition">Shop</Link>
        <ChevronRight size={13} />
        {product.category?.name ? (
          <>
            <Link href={`/shop?category=${encodeURIComponent(product.category.name)}`} className="hover:text-violet-600 transition">
              {product.category.name}
            </Link>
            <ChevronRight size={13} />
          </>
        ) : null}
        <span className="text-slate-900 dark:text-slate-100 truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-12">
        {/* Left Column: Product Image Gallery */}
        <div className="space-y-3">
          <Card className="h-96 md:h-[430px] flex items-center justify-center text-8xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative shadow-sm border border-slate-200/80 dark:border-slate-700/80">
            {hasImage ? (
              <img
                src={product.images![0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              CATEGORY_ICON[product.category?.name ?? ""] ?? "🛍️"
            )}
            {discountPercent > 0 && (
              <div className="absolute top-3 left-3 bg-red-500 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-md">
                {discountPercent}% OFF
              </div>
            )}
          </Card>

          {/* Secondary images if available */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {product.images.map((img: string, idx: number) => (
                <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0 cursor-pointer">
                  <img src={img} alt={`${product.name} view ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Info & Actions */}
        <div className="flex flex-col">
          {/* Category & Brand Badges */}
          <div className="flex items-center gap-2 mb-2">
            {product.category?.name && (
              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 uppercase tracking-wider text-[10px] font-bold">
                {product.category.name}
              </Badge>
            )}
            {product.brand && (
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                by {product.brand}
              </span>
            )}
          </div>

          {/* Product Title */}
          <h1 className="text-2xl lg:text-3xl font-bold mb-3 font-display tracking-tight text-slate-900 dark:text-white">
            {product.name}
          </h1>

          {/* Ratings & Reviews Count */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold text-sm px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
              <Star size={14} fill="currentColor" />
              <span>{ratingNum.toFixed(1)}</span>
            </div>
            <span className="text-xs text-slate-500">
              ({product.reviewCount?.toLocaleString("en-IN") ?? 0} customer reviews)
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            {inStock ? (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} /> In Stock ({product.stock} units)
              </span>
            ) : (
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                Out of Stock
              </span>
            )}
          </div>

          {/* Price Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 mb-6">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold font-display text-slate-900 dark:text-white">
                {money(product.price)}
              </span>
              {mrpNum > priceNum && (
                <span className="text-base line-through text-slate-400">
                  {money(product.mrp)}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Save {discountPercent}% ({money(mrpNum - priceNum)})
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Inclusive of all taxes. Free shipping on orders over ₹2,000.</p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Description</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {product.description || "No detailed description available for this product."}
            </p>
          </div>

          {/* Tags */}
          {Array.isArray(product.tags) && product.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Features &amp; Highlights</h3>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quantity, Add to Cart & Wishlist Actions */}
          <div className="pt-2 mb-6 border-t border-slate-200/80 dark:border-slate-800">
            <ProductDetailActions productId={product.id} stock={product.stock} />
          </div>

          {/* Value Props / Guarantees */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500">
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
              <Truck size={16} className="text-violet-600" />
              <span className="font-medium">Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
              <ShieldCheck size={16} className="text-violet-600" />
              <span className="font-medium">100% Genuine</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
              <RotateCcw size={16} className="text-violet-600" />
              <span className="font-medium">7 Days Return</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications Table */}
      {product.specifications && Object.keys(product.specifications as object).length > 0 && (
        <Card className="p-6 mb-10 shadow-sm">
          <h2 className="font-bold text-lg mb-4 font-display flex items-center gap-2">
            Technical Specifications
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {Object.entries(product.specifications as Record<string, string>).map(([key, val]) => (
              <div key={key} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                <span className="text-slate-500 font-medium">{key}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{val}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Customer Reviews Section */}
      <Card className="p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="font-bold text-lg font-display flex items-center gap-2">
              <MessageSquare size={18} className="text-violet-600" /> Customer Reviews
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Verified buyers and owner feedback</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-amber-500 flex items-center gap-1">
              <Star size={16} fill="currentColor" />
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{ratingNum.toFixed(1)}</span>
            </div>
            <span className="text-xs text-slate-500">out of 5</span>
          </div>
        </div>

        {reviewsList.length > 0 ? (
          <div className="space-y-4">
            {reviewsList.map((r: any) => (
              <div key={r.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-amber-500 text-xs">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        fill={i < (r.rating || 5) ? "currentColor" : "none"}
                        className={i < (r.rating || 5) ? "text-amber-500" : "text-slate-300 dark:text-slate-700"}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {r.user?.fullName ? r.user.fullName : "Verified Buyer"}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {r.comment || "Great product, matches description perfectly."}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Star size={20} />
            </div>
            <h4 className="text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">No customer reviews yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              This item is part of our fresh catalog. Be among the first to experience it!
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
