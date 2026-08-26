import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const CUSTOMER_PREFIXES = [
  "/dashboard", "/shop", "/search", "/products", "/ai-shop", "/cart",
  "/checkout", "/orders", "/wishlist", "/profile", "/preferences", "/notifications",
];
const BUSINESS_PREFIX = "/business";
const PUBLIC_PATHS = ["/", "/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/auth");
  const isCustomerRoute = CUSTOMER_PREFIXES.some((p) => pathname.startsWith(p));
  const isBusinessRoute = pathname.startsWith(BUSINESS_PREFIX);

  // Not logged in and hitting a protected route -> send to login
  if (!user && (isCustomerRoute || isBusinessRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Logged in and visiting a public auth page -> send to the right dashboard
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const accountType = (user.user_metadata?.account_type as string) || "customer";
    const url = request.nextUrl.clone();
    url.pathname = accountType === "business" ? "/business/dashboard" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Role-based access: a customer account can't view /business/*, and vice versa
  if (user) {
    const accountType = (user.user_metadata?.account_type as string) || "customer";
    if (isBusinessRoute && accountType !== "business") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    if (isCustomerRoute && accountType !== "customer") {
      const url = request.nextUrl.clone();
      url.pathname = "/business/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico, and static asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
