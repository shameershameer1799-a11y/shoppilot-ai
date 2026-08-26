export type AccountType = "customer" | "business";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  price: string;
  mrp: string;
  images: string[];
  rating: string;
  reviewCount: number;
  stock: number;
  specifications: Record<string, string>;
  tags: string[];
  categoryId: string;
};

export type CartItemView = {
  id: string;
  productId: string;
  quantity: number;
  savedForLater: boolean;
  product: Product;
};

export type OrderStatus = "ordered" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";

export type OrderView = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string;
  createdAt: string;
  items: Array<{ productName: string; quantity: number; price: string }>;
};

export type ProductMatch = {
  id: string;
  name: string;
  price: number;
  mrp: number;
  rating: number;
  score: number;
  reasons: string[];
};
