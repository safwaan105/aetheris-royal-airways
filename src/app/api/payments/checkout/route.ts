import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validation";
import { quoteBooking } from "@/lib/booking-service";
import { runKycCheck } from "@/lib/kyc";
import { getStripeClient } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createRazorpayPaymentLink, isRazorpayConfigured } from "@/lib/razorpay";

function getBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || `${new URL(request.url).protocol}//${new URL(request.url).host}`;
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: "Invalid checkout payload.",
          details: firstIssue
            ? `${firstIssue.path.join(".") || "payload"}: ${firstIssue.message}`
            : "Payload validation failed.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const kyc = await runKycCheck(parsed.data.passenger);
    if (kyc.status === "failed") {
      return NextResponse.json({ error: kyc.reason || "KYC failed." }, { status: 400 });
    }

    const quote = await quoteBooking({
      flightId: parsed.data.flightId,
      travelClass: parsed.data.travelClass,
      seats: parsed.data.seats,
      flightSnapshot: parsed.data.flightSnapshot,
    });

    const payableAmount = Math.max(1, Math.round(quote.totalPrice));
    const stripe = getStripeClient();
    const hasRazorpay = isRazorpayConfigured();
    const paymentProvider = stripe ? "stripe" : hasRazorpay ? "razorpay" : "manual_upi";

    if (!stripe && !hasRazorpay) {
      return NextResponse.json(
        { error: "No payment gateway configured. Add Stripe or Razorpay credentials." },
        { status: 503 },
      );
    }

    const pending = await prisma.pendingCheckout.create({
      data: {
        userId: auth.userId,
        flightId: parsed.data.flightId,
        ...(parsed.data.flightSnapshot
          ? { flightSnapshot: parsed.data.flightSnapshot as unknown as Prisma.JsonObject }
          : {}),
        travelClass: parsed.data.travelClass,
        seats: parsed.data.seats as unknown as Prisma.JsonArray,
        passenger: parsed.data.passenger as unknown as Prisma.JsonObject,
        quotedTotal: payableAmount,
        currency: "usd",
        paymentMethod: "pending",
        provider: paymentProvider,
        paymentStatus: "pending",
        kycStatus: kyc.status,
        kycReference: kyc.referenceId,
      },
    });

    await prisma.payment.create({
      data: {
        userId: auth.userId,
        pendingCheckoutId: pending.id,
        amount: payableAmount,
        currency: stripe ? "usd" : "inr",
        method: "pending",
        provider: paymentProvider,
        status: "pending",
      },
    });

    const baseUrl = getBaseUrl(request);
    if (!stripe) {
      const paymentLink = await createRazorpayPaymentLink({
        amountInInr: payableAmount,
        customerName: parsed.data.passenger.fullName,
        customerEmail: parsed.data.passenger.email,
        referenceId: pending.id,
        callbackUrl: `${baseUrl}/payment?mode=upi_auto&pendingCheckoutId=${encodeURIComponent(pending.id)}&amount=${encodeURIComponent(String(payableAmount))}`,
      });

      await prisma.pendingCheckout.update({
        where: { id: pending.id },
        data: {
          paymentSessionId: paymentLink.id,
        },
      });

      await prisma.payment.updateMany({
        where: { pendingCheckoutId: pending.id },
        data: {
          reference: paymentLink.id,
        },
      });

      return NextResponse.json({
        mode: "upi_auto",
        checkoutUrl: paymentLink.short_url || "",
        pendingCheckoutId: pending.id,
        amount: payableAmount,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: `${quote.flightSnapshot.flightNumber} ${quote.flightSnapshot.route.from}-${quote.flightSnapshot.route.to}`,
              description: `${parsed.data.travelClass.toUpperCase()} class x ${parsed.data.seats.length} seats`,
            },
            unit_amount: payableAmount * 100,
          },
        },
      ],
      metadata: {
        pendingCheckoutId: pending.id,
      },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
    });

    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: {
        provider: "stripe",
        paymentSessionId: session.id,
      },
    });

    await prisma.payment.updateMany({
      where: { pendingCheckoutId: pending.id },
      data: {
        provider: "stripe",
        reference: session.id,
      },
    });

    return NextResponse.json({
      mode: "stripe",
      checkoutUrl: session.url,
      sessionId: session.id,
      amount: payableAmount,
      pendingCheckoutId: pending.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create checkout.", details: String(error) },
      { status: 500 },
    );
  }
}
