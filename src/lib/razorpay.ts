import crypto from "crypto";

interface RazorpayPaymentLinkResponse {
  id: string;
  short_url?: string;
  status?: string;
}

function getBasicAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export async function createRazorpayPaymentLink(input: {
  amountInInr: number;
  customerName: string;
  customerEmail: string;
  referenceId: string;
  callbackUrl: string;
}) {
  const authHeader = getBasicAuthHeader();
  if (!authHeader) {
    throw new Error("Razorpay is not configured.");
  }

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount: Math.max(1, input.amountInInr) * 100,
      currency: "INR",
      reference_id: input.referenceId,
      description: "Aetheris Royal Airways Booking Payment",
      customer: {
        name: input.customerName || "Passenger",
        email: input.customerEmail || undefined,
      },
      notify: {
        sms: false,
        email: Boolean(input.customerEmail),
      },
      reminder_enable: true,
      callback_url: input.callbackUrl,
      callback_method: "get",
      accept_partial: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Razorpay payment link failed: ${message}`);
  }

  return (await response.json()) as RazorpayPaymentLinkResponse;
}

export async function fetchRazorpayPaymentLink(linkId: string) {
  const authHeader = getBasicAuthHeader();
  if (!authHeader) {
    throw new Error("Razorpay is not configured.");
  }

  const response = await fetch(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}`, {
    headers: {
      Authorization: authHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Razorpay fetch payment link failed: ${message}`);
  }

  return (await response.json()) as RazorpayPaymentLinkResponse;
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}
