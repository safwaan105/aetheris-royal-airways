import jwt from "jsonwebtoken";
import { createPublicKey } from "crypto";

type Provider = "google" | "apple";

interface JwkKey {
  kid?: string;
  x5c?: string[];
  kty?: string;
  n?: string;
  e?: string;
}

interface JwksResponse {
  keys?: JwkKey[];
}

const JWKS_URL: Record<Provider, string> = {
  google: "https://www.googleapis.com/oauth2/v3/certs",
  apple: "https://appleid.apple.com/auth/keys",
};
const GOOGLE_LEGACY_CERTS_URL = "https://www.googleapis.com/oauth2/v1/certs";

const cache = new Map<string, { pem: string; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function decodeHeader(token: string) {
  const decoded = jwt.decode(token, { complete: true }) as { header?: { kid?: string } } | null;
  return decoded?.header || {};
}

function certToPem(x5c: string) {
  const lines = x5c.match(/.{1,64}/g)?.join("\n") || x5c;
  return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----\n`;
}

function jwkToPem(key: JwkKey) {
  if (key.kty !== "RSA" || !key.n || !key.e) {
    return null;
  }
  const pem = createPublicKey({
    key: { kty: "RSA", n: key.n, e: key.e },
    format: "jwk",
  }).export({ type: "spki", format: "pem" });
  return typeof pem === "string" ? pem : pem.toString("utf8");
}

async function getProviderPem(provider: Provider, kid: string) {
  const cacheKey = `${provider}:${kid}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.pem;
  }

  const response = await fetch(JWKS_URL[provider], { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${provider} JWKS fetch failed.`);
  }
  const body = (await response.json()) as JwksResponse;
  const key = (body.keys || []).find((item) => item.kid === kid);

  let pem: string | null = null;
  if (key?.x5c?.[0]) {
    pem = certToPem(key.x5c[0]);
  } else if (key) {
    pem = jwkToPem(key);
  }

  if (!pem && provider === "google") {
    const legacyResponse = await fetch(GOOGLE_LEGACY_CERTS_URL, { cache: "no-store" });
    if (legacyResponse.ok) {
      const legacyBody = (await legacyResponse.json()) as Record<string, string>;
      pem = legacyBody[kid] || null;
    }
  }

  if (!pem) {
    throw new Error(`${provider} key not found for kid.`);
  }
  cache.set(cacheKey, { pem, expiresAt: Date.now() + CACHE_TTL_MS });
  return pem;
}

export async function verifyProviderIdToken<T>(input: {
  provider: Provider;
  token: string;
  audience: string;
  issuer: string | [string, ...string[]];
}) {
  const header = decodeHeader(input.token);
  if (!header.kid) {
    throw new Error("Missing token kid.");
  }
  const pem = await getProviderPem(input.provider, header.kid);

  return jwt.verify(input.token, pem, {
    algorithms: ["RS256"],
    audience: input.audience,
    issuer: input.issuer,
  }) as T;
}
