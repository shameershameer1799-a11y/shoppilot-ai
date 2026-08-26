import { ProductCard, type ProductCardData } from "./ProductCard";

export function ProductGrid({ products, wishedIds = [] }: { products: ProductCardData[]; wishedIds?: string[] }) {
  if (!products.length) {
    return <p className="text-sm text-slate-500 col-span-full">No products match your filters.</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} initialWished={wishedIds.includes(p.id)} />
      ))}
    </div>
  );
}
