import {
  pgTable, uuid, text, varchar, integer, numeric, boolean, timestamp,
  jsonb, primaryKey, index, pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ============================================================
   ENUMS
   ============================================================ */
export const accountTypeEnum = pgEnum("account_type", ["customer", "business"]);
export const orderStatusEnum = pgEnum("order_status", [
  "ordered", "processing", "shipped", "out_for_delivery", "delivered", "cancelled",
]);
export const segmentEnum = pgEnum("segment_type", [
  "new", "loyal", "vip", "high_intent", "price_sensitive", "at_risk", "cart_abandoner",
]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "scheduled", "active", "completed"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "order_update", "price_drop", "recommendation", "campaign", "system",
]);

/* ============================================================
   USERS & PROFILES
   users.id mirrors the Supabase auth.users id (uuid). We do not
   duplicate password hashes here — Supabase Auth owns credentials.
   ============================================================ */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // == auth.users.id
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  accountType: accountTypeEnum("account_type").notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  avatarUrl: text("avatar_url"),
  phone: varchar("phone", { length: 32 }),
  addressLine: text("address_line"),
  city: varchar("city", { length: 120 }),
  pincode: varchar("pincode", { length: 20 }),
  preferredCategories: jsonb("preferred_categories").$type<string[]>().default([]),
  budgetMin: numeric("budget_min", { precision: 12, scale: 2 }),
  budgetMax: numeric("budget_max", { precision: 12, scale: 2 }),
  darkModePref: boolean("dark_mode_pref").default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storeName: varchar("store_name", { length: 255 }).notNull(),
  supportEmail: varchar("support_email", { length: 255 }),
  plan: varchar("plan", { length: 40 }).default("starter"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  ownerIdx: index("businesses_owner_idx").on(t.ownerId),
}));

/* ============================================================
   CATALOG
   ============================================================ */
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  icon: varchar("icon", { length: 16 }),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").references(() => businesses.id, { onDelete: "set null" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  brand: varchar("brand", { length: 120 }),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  mrp: numeric("mrp", { precision: 12, scale: 2 }).notNull(),
  images: jsonb("images").$type<string[]>().default([]),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  stock: integer("stock").notNull().default(0),
  specifications: jsonb("specifications").$type<Record<string, string>>().default({}),
  tags: jsonb("tags").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  categoryIdx: index("products_category_idx").on(t.categoryId),
  businessIdx: index("products_business_idx").on(t.businessId),
  nameIdx: index("products_name_idx").on(t.name),
}));

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  warehouseLocation: varchar("warehouse_location", { length: 120 }).default("main"),
  quantity: integer("quantity").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
  reorderThreshold: integer("reorder_threshold").default(10),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  productIdx: index("inventory_product_idx").on(t.productId),
}));

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  productIdx: index("reviews_product_idx").on(t.productId),
}));

/* ============================================================
   CART / WISHLIST
   ============================================================ */
export const cart = pgTable("cart", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  couponCode: varchar("coupon_code", { length: 60 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id").notNull().references(() => cart.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  savedForLater: boolean("saved_for_later").default(false),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  cartIdx: index("cart_items_cart_idx").on(t.cartId),
  uniqueCartProduct: index("cart_items_cart_product_idx").on(t.cartId, t.productId),
}));

export const wishlist = pgTable("wishlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index("wishlist_user_idx").on(t.userId),
}));

/* ============================================================
   ORDERS
   ============================================================ */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 30 }).notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").notNull().default("ordered"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  deliveryFee: numeric("delivery_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  addressLine: text("address_line"),
  city: varchar("city", { length: 120 }),
  pincode: varchar("pincode", { length: 20 }),
  phone: varchar("phone", { length: 32 }),
  paymentMethod: varchar("payment_method", { length: 40 }),
  paymentRef: varchar("payment_ref", { length: 120 }), // stripe payment_intent id, or "mock_xxx"
  isMockPayment: boolean("is_mock_payment").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index("orders_user_idx").on(t.userId),
  statusIdx: index("orders_status_idx").on(t.status),
}));

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  productName: varchar("product_name", { length: 255 }).notNull(), // snapshot at purchase time
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(), // snapshot at purchase time
}, (t) => ({
  orderIdx: index("order_items_order_idx").on(t.orderId),
}));

/* ============================================================
   PERSONALIZATION / AI
   ============================================================ */
export const customerPreferences = pgTable("customer_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  preferredCategories: jsonb("preferred_categories").$type<string[]>().default([]),
  preferredBrands: jsonb("preferred_brands").$type<string[]>().default([]),
  budgetMin: numeric("budget_min", { precision: 12, scale: 2 }),
  budgetMax: numeric("budget_max", { precision: 12, scale: 2 }),
  emailOptIn: boolean("email_opt_in").default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const searchHistory = pgTable("search_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  resultCount: integer("result_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index("search_history_user_idx").on(t.userId),
}));

export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  matchScore: integer("match_score").notNull(), // 0-100
  reasons: jsonb("reasons").$type<string[]>().default([]),
  source: varchar("source", { length: 40 }).default("ai_chat"), // ai_chat | dashboard | similarity
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index("recommendations_user_idx").on(t.userId),
}));

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 20 }).notNull().default("shopping"), // shopping | growth
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index("ai_conversations_user_idx").on(t.userId),
}));

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user | assistant
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}), // e.g. product matches, opportunities
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  conversationIdx: index("ai_messages_conversation_idx").on(t.conversationId),
}));

export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  impact: varchar("impact", { length: 20 }).default("medium"), // low | medium | high
  effort: varchar("effort", { length: 20 }).default("medium"),
  potentialRevenue: numeric("potential_revenue", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 20 }).default("open"), // open | actioned | dismissed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  businessIdx: index("ai_insights_business_idx").on(t.businessId),
}));

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull().default("system"),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index("notifications_user_idx").on(t.userId),
}));

/* ============================================================
   BUSINESS: CUSTOMERS / SEGMENTS / CAMPAIGNS / ANALYTICS
   ============================================================ */
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  aiScore: integer("ai_score").default(50), // 0-100
  lifetimeSpend: numeric("lifetime_spend", { precision: 12, scale: 2 }).default("0"),
  lastPurchaseAt: timestamp("last_purchase_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  businessIdx: index("customers_business_idx").on(t.businessId),
}));

export const customerSegments = pgTable("customer_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  segment: segmentEnum("segment").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  customerIdx: index("customer_segments_customer_idx").on(t.customerId),
}));

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  status: campaignStatusEnum("status").notNull().default("draft"),
  targetSegment: segmentEnum("target_segment"),
  offer: varchar("offer", { length: 120 }), // e.g. "10% off"
  sentCount: integer("sent_count").default(0),
  recoveredRevenue: numeric("recovered_revenue", { precision: 12, scale: 2 }).default("0"),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }).default("0"),
  launchAt: timestamp("launch_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  businessIdx: index("campaigns_business_idx").on(t.businessId),
}));

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: varchar("event_type", { length: 60 }).notNull(), // page_view | product_view | add_to_cart | checkout_start | purchase | search
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  businessIdx: index("analytics_events_business_idx").on(t.businessId),
  typeIdx: index("analytics_events_type_idx").on(t.eventType),
}));

/* ============================================================
   RELATIONS (for Drizzle's relational query API)
   ============================================================ */
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  business: one(businesses, { fields: [users.id], references: [businesses.ownerId] }),
  cart: one(cart, { fields: [users.id], references: [cart.userId] }),
  orders: many(orders),
  wishlist: many(wishlist),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  business: one(businesses, { fields: [products.businessId], references: [businesses.id] }),
  reviews: many(reviews),
  inventory: many(inventory),
}));

export const cartRelations = relations(cart, ({ one, many }) => ({
  user: one(users, { fields: [cart.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(cart, { fields: [cartItems.cartId], references: [cart.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, { fields: [businesses.ownerId], references: [users.id] }),
  products: many(products),
  customers: many(customers),
  campaigns: many(campaigns),
  insights: many(aiInsights),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  business: one(businesses, { fields: [customers.businessId], references: [businesses.id] }),
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  segments: many(customerSegments),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, { fields: [aiConversations.userId], references: [users.id] }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, { fields: [aiMessages.conversationId], references: [aiConversations.id] }),
}));

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(users, { fields: [wishlist.userId], references: [users.id] }),
  product: one(products, { fields: [wishlist.productId], references: [products.id] }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, { fields: [analyticsEvents.userId], references: [users.id] }),
  business: one(businesses, { fields: [analyticsEvents.businessId], references: [businesses.id] }),
  product: one(products, { fields: [analyticsEvents.productId], references: [products.id] }),
}));
