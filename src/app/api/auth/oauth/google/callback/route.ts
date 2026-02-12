import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseGoogleIdToken, upsertOAuthCustomer } from "@/lib/oauth";
import { signAuthToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth-cookie";
import { resolveBaseUrl } from "@/lib/app-url";

function hasPlaceholderGoogleConfig(clientId: string | undefined, clientSecret: string | undefined) {
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

  if (hasPlaceholderGoogleConfig(clientId, clientSecret)) {
    return NextResponse.redirect(new URL("/auth?oauth=google_not_configured", baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/auth?oauth=google_failed", baseUrl));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state_google")?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(new URL("/auth?oauth=google_state_error", baseUrl));
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
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

    const identity = await parseGoogleIdToken(tokenData.id_token, clientId);
    const user = await upsertOAuthCustomer(identity);
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role as "customer" | "admin",
    });

    const response = NextResponse.redirect(new URL("/", baseUrl));
    setAuthCookie(response, token);
    response.cookies.delete("oauth_state_google");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/auth?oauth=google_failed", baseUrl));
  }
}
