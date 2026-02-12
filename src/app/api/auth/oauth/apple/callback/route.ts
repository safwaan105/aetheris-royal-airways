import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseAppleIdToken, upsertOAuthCustomer } from "@/lib/oauth";
import { signAuthToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth-cookie";

function getBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || `${new URL(request.url).protocol}//${new URL(request.url).host}`;
}

async function completeAppleAuth(input: {
  request: Request;
  code: string | null;
  state: string | null;
}) {
  const clientId = process.env.APPLE_CLIENT_ID;
  const clientSecret = process.env.APPLE_CLIENT_SECRET;
  if (!input.code || !input.state || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/auth?oauth=apple_failed", getBaseUrl(input.request)));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state_apple")?.value;
  if (!expectedState || expectedState !== input.state) {
    return NextResponse.redirect(new URL("/auth?oauth=apple_state_error", getBaseUrl(input.request)));
  }

  try {
    const baseUrl = getBaseUrl(input.request);
    const tokenResponse = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: `${baseUrl}/api/auth/oauth/apple/callback`,
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      throw new Error("Apple token exchange failed.");
    }
    const tokenData = (await tokenResponse.json()) as { id_token?: string };
    if (!tokenData.id_token) {
      throw new Error("Missing Apple id_token.");
    }

    const identity = await parseAppleIdToken(tokenData.id_token, clientId);
    const user = await upsertOAuthCustomer(identity);
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role as "customer" | "admin",
    });

    const response = NextResponse.redirect(new URL("/", baseUrl));
    setAuthCookie(response, token);
    response.cookies.delete("oauth_state_apple");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/auth?oauth=apple_failed", getBaseUrl(input.request)));
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return completeAppleAuth({
    request,
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  return completeAppleAuth({
    request,
    code: String(formData.get("code") || ""),
    state: String(formData.get("state") || ""),
  });
}
