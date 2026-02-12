import { NextResponse, type NextRequest } from "next/server";

interface DecodedPayload {
  userId?: string;
  email?: string;
  role?: string;
  exp?: number;
}

function decodeJwtPayload(token: string): DecodedPayload | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(normalized);
    return JSON.parse(json) as DecodedPayload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;
  const isProtectedCustomerRoute =
    pathname.startsWith("/my-bookings") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/payment") ||
    pathname.startsWith("/favorites") ||
    pathname.startsWith("/search-history") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/payment-history");

  const payload = token ? decodeJwtPayload(token) : null;
  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  const isInvalidToken =
    !!token &&
    (!payload ||
      !payload.userId ||
      !payload.email ||
      (payload.role !== "customer" && payload.role !== "admin") ||
      (typeof payload.exp === "number" && payload.exp <= nowEpochSeconds));

  if ((!token || isInvalidToken) && isProtectedCustomerRoute) {
    const redirectUrl = new URL("/auth", request.url);
    const response = NextResponse.redirect(redirectUrl);
    if (token) {
      response.cookies.delete("auth_token");
    }
    return response;
  }

  if (pathname.startsWith("/admin")) {
    if (!token || isInvalidToken) {
      const response = NextResponse.redirect(new URL("/auth", request.url));
      if (token) {
        response.cookies.delete("auth_token");
      }
      return response;
    }
    if (payload?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/my-bookings/:path*",
    "/checkout/:path*",
    "/payment/:path*",
    "/favorites/:path*",
    "/search-history/:path*",
    "/support/:path*",
    "/payment-history/:path*",
  ],
};
