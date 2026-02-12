import { headers } from "next/headers";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export async function resolveBaseUrl(request?: Request) {
  if (request) {
    // In development, always trust the incoming request host so OAuth works
    // even when Next.js moves from 3000 to 3001.
    if (process.env.NODE_ENV !== "production") {
      const url = new URL(request.url);
      return normalizeBaseUrl(`${url.protocol}//${url.host}`);
    }
  }

  const envBase = process.env.NEXT_PUBLIC_APP_URL;
  if (envBase && envBase.trim()) {
    return normalizeBaseUrl(envBase);
  }

  if (request) {
    const url = new URL(request.url);
    return normalizeBaseUrl(`${url.protocol}//${url.host}`);
  }

  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto") || "http";
  const forwardedHost = headerStore.get("x-forwarded-host") || headerStore.get("host");
  if (!forwardedHost) {
    return "http://localhost:3000";
  }

  return normalizeBaseUrl(`${forwardedProto}://${forwardedHost}`);
}
