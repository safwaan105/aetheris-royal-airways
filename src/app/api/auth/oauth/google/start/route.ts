import crypto from "crypto";
import { NextResponse } from "next/server";
import { resolveBaseUrl } from "@/lib/app-url";

function isGoogleClientIdConfigured(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith("your-real-client-id")) return false;
  return normalized.endsWith(".apps.googleusercontent.com");
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const baseUrl = await resolveBaseUrl(request);
    return NextResponse.redirect(new URL("/auth?oauth=google_not_configured", baseUrl));
  }
  if (!isGoogleClientIdConfigured(clientId)) {
    const baseUrl = await resolveBaseUrl(request);
    return NextResponse.redirect(new URL("/auth?oauth=google_not_configured", baseUrl));
  }

  const baseUrl = await resolveBaseUrl(request);
  const redirectUri = `${baseUrl}/api/auth/oauth/google/callback`;
  const state = crypto.randomBytes(20).toString("hex");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("oauth_state_google", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  return response;
}
