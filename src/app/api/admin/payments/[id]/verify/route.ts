import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser, isAdmin } from "@/lib/auth";
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

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth || !isAdmin(auth.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Payment id is required." }, { status: 400 });
    }

    await connectToDatabase();

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }
    if (!payment.pendingCheckoutId) {
      return NextResponse.json({ error: "Payment has no pending checkout." }, { status: 400 });
    }

    const pending = await prisma.pendingCheckout.findUnique({
      where: { id: payment.pendingCheckoutId },
    });
    if (!pending) {
      return NextResponse.json({ error: "Pending checkout not found." }, { status: 404 });
    }

    if (pending.bookingId) {
      return NextResponse.json({ message: "Booking already confirmed.", bookingId: pending.bookingId });
    }

    const booking = await finalizeBooking({
      userId: pending.userId,
      flightId: pending.flightId,
      travelClass: pending.travelClass as SeatClass,
      seats: pending.seats as unknown as Seat[],
      passenger: pending.passenger as unknown as PassengerJson,
      paymentProvider: pending.provider === "stripe" ? "stripe" : "simulated",
      paymentReference: payment.reference || pending.paymentSessionId || `MANUAL-${pending.id}`,
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

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        bookingId: booking.id,
        status: "paid",
      },
    });

    return NextResponse.json({
      message: "Payment verified and ticket issued.",
      bookingId: booking.id,
      pnr: booking.pnr,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to verify payment.", details: String(error) },
      { status: 500 },
    );
  }
}
