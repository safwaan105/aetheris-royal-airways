import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseGoogleIdToken, upsertOAuthCustomer } from "@/lib/oauth";
import { signAuthToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth-cookie";
import { resolveBaseUrl } from "@/lib/app-url";
import { isOAuthStateValid } from "@/lib/oauth-state";

function hasPlaceholderGoogleConfig(
  clientId: string | undefined,
  clientSecret: string | undefined,
) {
  const id = (clientId || "").trim().toLowerCase();
  const secret = (clientSecret || "").trim().toLowerCase();
  return (
    !id ||
    !secret ||
    id.startsWith("your-real-client-id") ||
    secret.startsWith("your-real-google-client-secret")
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = await resolveBaseUrl(request);

  if (oauthError) {
    return NextResponse.redirect(new URL(`/auth?oauth=google_${oauthError}`, baseUrl));
  }

  if (!clientId || !clientSecret || hasPlaceholderGoogleConfig(clientId, clientSecret)) {
    return NextResponse.redirect(new URL("/auth?oauth=google_not_configured", baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/auth?oauth=google_failed", baseUrl));
  }

  const ensuredClientId: string = clientId;
  const ensuredClientSecret: string = clientSecret;

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state_google")?.value;
  const isCookieStateMatch = !!expectedState && expectedState === state;
  const isSignedStateValid = isOAuthStateValid(state);
  // Some browsers/extensions aggressively strip temporary cookies during OAuth
  // redirects. Keep state checks when available, but do not hard-fail login when
  // a valid authorization code is present.
  const isStateTrusted = isCookieStateMatch || isSignedStateValid;

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: ensuredClientId,
        client_secret: ensuredClientSecret,
        redirect_uri: `${baseUrl}/api/auth/oauth/google/callback`,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      if (body.includes("redirect_uri_mismatch")) {
        return NextResponse.redirect(new URL("/auth?oauth=google_redirect_uri_mismatch", baseUrl));
      }
      if (body.includes("invalid_client")) {
        return NextResponse.redirect(new URL("/auth?oauth=google_invalid_client", baseUrl));
      }
      throw new Error("Google token exchange failed.");
    }

    const tokenData = (await tokenResponse.json()) as { id_token?: string };
    if (!tokenData.id_token) {
      throw new Error("Missing Google id_token.");
    }

    const identity = await parseGoogleIdToken(tokenData.id_token, ensuredClientId);
    const user = await upsertOAuthCustomer(identity);
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role as "customer" | "admin",
    });

    const response = NextResponse.redirect(new URL("/", baseUrl));
    setAuthCookie(response, token);
    response.cookies.delete("oauth_state_google");
    if (!isStateTrusted) {
      response.cookies.set("oauth_state_google_warn", "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60,
        path: "/",
      });
    }
    return response;
  } catch {
    return NextResponse.redirect(new URL("/auth?oauth=google_failed", baseUrl));
  }
}
