import Stripe from "stripe";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { finalizeBooking } from "@/lib/booking-service";
import type { Seat, SeatClass } from "@/types";

interface PassengerJson {
  fullName: string;
  passportNumber: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth: string;
  nationality: string;
  passportCountry: string;
  passportExpiry: string;
}

interface FlightSnapshotJson {
  flightNumber: string;
  airline: string;
  route: { from: string; to: string };
  departureAt: string;
  arrivalAt: string;
  basePrice: number;
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured." }, { status: 400 });
  }

  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
    }

    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const pendingCheckoutId = session.metadata?.pendingCheckoutId;
    if (!pendingCheckoutId) {
      return NextResponse.json({ error: "Missing pendingCheckoutId metadata." }, { status: 400 });
    }

    await connectToDatabase();
    const pending = await prisma.pendingCheckout.findUnique({ where: { id: pendingCheckoutId } });
    if (!pending || pending.bookingId) {
      return NextResponse.json({ received: true });
    }

    if (session.payment_status !== "paid") {
      await prisma.pendingCheckout.update({
        where: { id: pending.id },
        data: { paymentStatus: "failed" },
      });
      await prisma.payment.updateMany({
        where: { pendingCheckoutId: pending.id },
        data: { status: "failed", method: "credit_card" },
      });
      return NextResponse.json({ received: true });
    }

    const booking = await finalizeBooking({
      userId: pending.userId,
      flightId: pending.flightId,
      travelClass: pending.travelClass as SeatClass,
      seats: pending.seats as unknown as Seat[],
      passenger: pending.passenger as unknown as PassengerJson,
      paymentProvider: "stripe",
      paymentReference: pending.paymentSessionId || session.id,
      kycStatus: pending.kycStatus as "passed" | "manual_review" | "failed",
      kycReference: pending.kycReference ?? undefined,
      flightSnapshot: (pending.flightSnapshot as unknown as FlightSnapshotJson | null) ?? undefined,
    });

    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: {
        paymentStatus: "paid",
        paymentMethod: "credit_card",
        bookingId: booking.id,
      },
    });

    await prisma.payment.updateMany({
      where: { pendingCheckoutId: pending.id },
      data: {
        bookingId: booking.id,
        status: "paid",
        method: "credit_card",
        reference: pending.paymentSessionId || session.id,
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: "Webhook processing failed.", details: String(error) }, { status: 400 });
  }
}
