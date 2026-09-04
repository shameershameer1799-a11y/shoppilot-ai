"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { ProductGrid } from "@/components/customer/ProductGrid";
import type { ProductCardData } from "@/components/customer/ProductCard";

const CATEGORIES = ["Laptops", "Smartphones", "Headphones", "Watches", "Shoes", "Cameras", "Backpacks", "Accessories"];

export default function ShopPage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [rating, setRating] = useState("");
  const [sort, setSort] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (price) { const [min, max] = price.split("-"); params.set("minPrice", min); params.set("maxPrice", max); }
    if (rating) params.set("minRating", rating);
    if (sort) params.set("sort", sort);

    try {
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load products"); setProducts([]); return; }
      setProducts(data.items);
    } catch {
      setError("Failed to load products. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [search, category, price, rating, sort]);

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce search typing
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Shop</h1>
      <p className="text-sm mb-5 text-slate-500">Browse the full catalog</p>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-6">
        <div className="relative flex-1 min-w-full sm:min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="field-input pl-9 w-full"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
          <select className="field-input w-full sm:w-auto text-xs sm:text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="field-input w-full sm:w-auto text-xs sm:text-sm" value={price} onChange={(e) => setPrice(e.target.value)}>
            <option value="">Any Price</option>
            <option value="0-5000">Under ₹5,000</option>
            <option value="5000-20000">₹5,000–₹20,000</option>
            <option value="20000-60000">₹20,000–₹60,000</option>
            <option value="60000-999999">₹60,000+</option>
          </select>
          <select className="field-input w-full sm:w-auto text-xs sm:text-sm" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">Any Rating</option>
            <option value="4.5">4.5★ &amp; up</option>
            <option value="4">4★ &amp; up</option>
          </select>
          <select className="field-input w-full sm:w-auto text-xs sm:text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="">Sort: Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Rating</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
