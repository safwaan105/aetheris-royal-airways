import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyProviderIdToken } from "@/lib/jwks";

interface OAuthIdentity {
  email: string;
  name: string;
}

export async function upsertOAuthCustomer(identity: OAuthIdentity) {
  const email = identity.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(`oauth:${email}:${Date.now()}`, 12);
  return prisma.user.create({
    data: {
      email,
      name: identity.name || email.split("@")[0],
      passwordHash,
      role: "customer",
    },
  });
}

export async function parseGoogleIdToken(idToken: string, expectedAud: string): Promise<OAuthIdentity> {
  const payload = await verifyProviderIdToken<{
    email?: string;
    email_verified?: boolean | string;
    name?: string;
  }>({
    provider: "google",
    token: idToken,
    audience: expectedAud,
    issuer: ["https://accounts.google.com", "accounts.google.com"] as [string, string],
  });

  const emailVerified =
    payload.email_verified === true || payload.email_verified === "true";

  if (!payload.email || !emailVerified) {
    throw new Error("Google account email is not verified.");
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split("@")[0],
  };
}

export async function parseAppleIdToken(idToken: string, expectedAud: string): Promise<OAuthIdentity> {
  const payload = await verifyProviderIdToken<{
    email?: string;
    email_verified?: string | boolean;
  }>({
    provider: "apple",
    token: idToken,
    audience: expectedAud,
    issuer: "https://appleid.apple.com",
  });

  const emailVerified =
    payload.email_verified === true || payload.email_verified === "true";

  if (!payload.email || !emailVerified) {
    throw new Error("Apple account email is not verified.");
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.email.split("@")[0],
  };
}
