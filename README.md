# ShopPilot AI — Agentic Commerce & Smart Growth Assistant

Full-stack Next.js 14 (App Router) + TypeScript + Tailwind commerce platform with an AI shopping agent for customers and an AI growth assistant for businesses.

## Stack

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS
- **Database**: PostgreSQL (Supabase), Drizzle ORM
- **Auth**: Supabase Auth (email/password), role-based middleware
- **AI**: OpenAI (`gpt-4o-mini`, function-calling) with a deterministic mock fallback when no API key is set
- **Payments**: Stripe with a mock-payment fallback when no key is set
- **Charts**: Recharts

The app is designed to run fully in **demo mode** with zero external API keys except a Postgres connection — AI chat and payments both fall back to mock implementations automatically. See `src/lib/ai/service.ts` and `src/lib/payments/stripe.ts`.

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm run db:push      # creates all tables from src/lib/db/schema.ts
npm run db:seed      # seeds categories + 18 demo products
npm run dev
```

Visit `http://localhost:3000`.

### Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon public key** into `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copy the **service_role key** into `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose client-side).
4. Copy the pooled connection string (Settings → Database → Connection Pooling, port 6543) into `DATABASE_URL`.
5. In Authentication settings, disable "Confirm email" for faster local testing, or check your inbox after signing up.

### Enabling real AI (optional)

Set `OPENAI_API_KEY`. Without it, `/ai-shop` and `/business/ai-growth` still work end-to-end using deterministic keyword/rule-based matching against your real product data — same request/response shape, so nothing in the UI needs to change when you add the key later.

### Enabling real payments (optional)

Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Without them, checkout completes with a synthesized `mock_...` payment reference and orders are marked `isMockPayment: true`.

### Creating a business account + demo data

The seed script populates the product catalog but can't create Supabase Auth users directly (that needs the Admin API). To get a fully populated business dashboard:

1. Sign up through the UI with account type **Business**, using the email in `SEED_BUSINESS_EMAIL` (defaults to `business@demo.com`).
2. Re-run `npm run db:seed` — it will find that business and attach demo customers, campaigns, and AI insights to it.

## Project structure

```
src/
  app/
    (customer)/        # shop, ai-shop, cart, checkout, orders, wishlist, profile, ...
    (business)/         # business/dashboard, products, orders, customers, analytics,
                        # campaigns, ai-insights, ai-growth, settings
    api/                # route handlers: auth, products, cart, orders, ai, business
    login/ signup/      # auth pages
    page.tsx            # landing page
  components/
    ui/                 # Button, Card, Badge, MatchRing
    shared/             # Navbar, FloatingAssistant
    customer/           # ProductCard, ProductGrid, sidebar, order tracker, ...
    business/           # sidebar, KPI cards, charts, opportunity card
  lib/
    db/                 # Drizzle schema (23 tables) + lazy-init client
    supabase/           # browser / server / middleware clients
    auth/               # session helpers, role guards
    ai/                 # OpenAI service + mock fallback
    payments/           # Stripe service + mock fallback
    utils.ts
  middleware.ts         # role-based route protection
scripts/
  seed.ts               # demo data seeding
```

## Database schema

All 23 tables from the spec are defined in `src/lib/db/schema.ts` with proper foreign keys, indexes, enums, and Drizzle relations: `users`, `profiles`, `businesses`, `products`, `categories`, `cart`, `cart_items`, `wishlist`, `orders`, `order_items`, `reviews`, `customer_preferences`, `search_history`, `recommendations`, `ai_conversations`, `ai_messages`, `notifications`, `campaigns`, `customers`, `analytics_events`, `customer_segments`, `ai_insights`, `inventory`.

Run `npm run db:studio` to browse data with Drizzle Studio.

## Notes on scope

- **Business analytics** (`/business/analytics`, dashboard trend charts) use illustrative demo numbers alongside real KPI queries — wiring full time-series aggregation over `analytics_events` is the natural next step once you have real event volume.
- **Business order scoping**: `/business/orders` currently shows all platform orders for demo simplicity. A production multi-tenant deployment should join through `order_items → products.business_id` to scope orders to the logged-in business.
- **RLS**: Drizzle queries here use the service-level Postgres connection, not Supabase's row-level security. If you expose direct Supabase client queries from the browser anywhere, add RLS policies first.
