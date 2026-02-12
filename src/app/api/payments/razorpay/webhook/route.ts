import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { finalizeBooking } from "@/lib/booking-service";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
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

async function finalizeFromPending(pendingId: string, paymentReference: string) {
  const pending = await prisma.pendingCheckout.findUnique({ where: { id: pendingId } });
  if (!pending) return;
  if (pending.bookingId) return;

  const booking = await finalizeBooking({
    userId: pending.userId,
    flightId: pending.flightId,
    travelClass: pending.travelClass as SeatClass,
    seats: pending.seats as unknown as Seat[],
    passenger: pending.passenger as unknown as PassengerJson,
    paymentProvider: "simulated",
    paymentReference,
    kycStatus: pending.kycStatus as "passed" | "manual_review" | "failed",
    kycReference: pending.kycReference ?? undefined,
    flightSnapshot: (pending.flightSnapshot as unknown as FlightSnapshotJson | null) ?? undefined,
  });

  await prisma.pendingCheckout.update({
    where: { id: pending.id },
    data: {
      paymentStatus: "paid",
      bookingId: booking.id,
    },
  });

  await prisma.payment.updateMany({
    where: { pendingCheckoutId: pending.id },
    data: {
      status: "paid",
      bookingId: booking.id,
      reference: paymentReference,
    },
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const body = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment_link?: { entity?: { id?: string; reference_id?: string; status?: string } };
        payment?: { entity?: { id?: string; status?: string } };
      };
    };

    const paymentLinkId = body.payload?.payment_link?.entity?.id;
    const pendingId = body.payload?.payment_link?.entity?.reference_id;
    const paymentStatus = body.payload?.payment?.entity?.status;
    const paymentId = body.payload?.payment?.entity?.id;

    if (!pendingId && !paymentLinkId) {
      return NextResponse.json({ ok: true });
    }

    const pending = await prisma.pendingCheckout.findFirst({
      where: {
        OR: [
          ...(pendingId ? [{ id: pendingId }] : []),
          ...(paymentLinkId ? [{ paymentSessionId: paymentLinkId }] : []),
        ],
      },
    });

    if (!pending) {
      return NextResponse.json({ ok: true });
    }

    if (body.event === "payment_link.paid" || paymentStatus === "captured") {
      await finalizeFromPending(pending.id, paymentId || paymentLinkId || `RZP-${pending.id}`);
      return NextResponse.json({ ok: true });
    }

    if (body.event === "payment_link.expired" || body.event === "payment.failed") {
      await prisma.pendingCheckout.update({
        where: { id: pending.id },
        data: { paymentStatus: "failed" },
      });
      await prisma.payment.updateMany({
        where: { pendingCheckoutId: pending.id },
        data: {
          status: "failed",
          reference: paymentId || paymentLinkId || undefined,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Razorpay webhook failed.", details: String(error) },
      { status: 500 },
    );
  }
}
