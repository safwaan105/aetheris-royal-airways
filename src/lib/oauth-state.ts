import crypto from "crypto";

const STATE_TTL_SECONDS = 60 * 10;

function getStateSecret() {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.JWT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.APP_SECRET ||
    ""
  );
}

function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createOAuthState() {
  const secret = getStateSecret();
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(20).toString("hex");
  const payload = `${issuedAt}.${nonce}`;

  if (!secret) {
    return nonce;
  }

  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function isOAuthStateValid(value: string | null | undefined) {
  if (!value) return false;
  const secret = getStateSecret();

  if (!secret) {
    return value.length >= 20;
  }

  const [issuedAtRaw, nonce, signature] = value.split(".");
  if (!issuedAtRaw || !nonce || !signature) return false;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - issuedAt > STATE_TTL_SECONDS || issuedAt - now > 60) return false;

  const payload = `${issuedAtRaw}.${nonce}`;
  const expectedSignature = signPayload(payload, secret);
  if (signature.length !== expectedSignature.length) return false;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
