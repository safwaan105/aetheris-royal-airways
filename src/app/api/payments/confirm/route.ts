import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
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
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      sessionId?: string;
      pendingCheckoutId?: string;
      paymentMethod?: "upi" | "credit_card" | "debit_card" | "net_banking" | "wallet" | "crypto";
      forceFail?: boolean;
    };
    if (!body.sessionId && !body.pendingCheckoutId) {
      return NextResponse.json({ error: "sessionId or pendingCheckoutId required." }, { status: 400 });
    }

    await connectToDatabase();

    const pending = await prisma.pendingCheckout.findFirst({
      where: {
        userId: auth.userId,
        ...(body.sessionId ? { paymentSessionId: body.sessionId } : { id: body.pendingCheckoutId }),
      },
    });

    if (!pending) {
      return NextResponse.json({ error: "Pending checkout not found." }, { status: 404 });
    }

    const chosenMethod = body.paymentMethod || pending.paymentMethod || "upi";

    if (body.forceFail) {
      await prisma.pendingCheckout.update({
        where: { id: pending.id },
        data: {
          paymentStatus: "failed",
          paymentMethod: chosenMethod,
        },
      });
      await prisma.payment.updateMany({
        where: { pendingCheckoutId: pending.id },
        data: {
          status: "failed",
          method: chosenMethod,
        },
      });
      return NextResponse.json({ error: "Payment failed." }, { status: 402 });
    }

    if (pending.bookingId) {
      const existing = await prisma.booking.findUnique({ where: { id: pending.bookingId } });
      return NextResponse.json({
        message: "Booking already confirmed.",
        bookingId: existing?.id,
        pnr: existing?.pnr,
        totalPrice: existing?.totalPrice,
      });
    }

    if (pending.provider !== "stripe") {
      return NextResponse.json(
        { error: "Unsupported payment provider. Ticket can be issued only after verified online payment." },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    if (!stripe || !pending.paymentSessionId) {
      return NextResponse.json({ error: "Stripe not configured." }, { status: 500 });
    }
    const session = await stripe.checkout.sessions.retrieve(pending.paymentSessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed." }, { status: 402 });
    }

    const booking = await finalizeBooking({
      userId: pending.userId,
      flightId: pending.flightId,
      travelClass: pending.travelClass as SeatClass,
      seats: pending.seats as unknown as Seat[],
      passenger: pending.passenger as unknown as PassengerJson,
      paymentProvider: "stripe",
      paymentReference: pending.paymentSessionId,
      kycStatus: pending.kycStatus as "passed" | "manual_review" | "failed",
      kycReference: pending.kycReference ?? undefined,
      flightSnapshot: (pending.flightSnapshot as unknown as FlightSnapshotJson | null) ?? undefined,
    });

    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: {
        paymentStatus: "paid",
        paymentMethod: chosenMethod,
        bookingId: booking.id,
      },
    });

    await prisma.payment.updateMany({
      where: { pendingCheckoutId: pending.id },
      data: {
        bookingId: booking.id,
        status: "paid",
        method: chosenMethod,
        reference: pending.paymentSessionId,
      },
    });

    return NextResponse.json({
      message: "Payment confirmed and booking finalized.",
      bookingId: booking.id,
      pnr: booking.pnr,
      totalPrice: booking.totalPrice,
    });
  } catch (error) {
    return NextResponse.json({ error: "Payment confirm failed.", details: String(error) }, { status: 500 });
  }
}
