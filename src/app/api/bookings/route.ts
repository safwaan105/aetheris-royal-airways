import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { bookingSchema } from "@/lib/validation";
import { runKycCheck } from "@/lib/kyc";
import { finalizeBooking } from "@/lib/booking-service";
import { prisma } from "@/lib/prisma";
import type { FlightRoute, Seat } from "@/types";

interface FlightSnapshotJson {
  flightNumber: string;
  route: FlightRoute;
  departureAt: string | Date;
  arrivalAt: string | Date;
  airline: string;
}

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();
  const bookings = await prisma.booking.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    include: { flight: true },
  });

  return NextResponse.json(
    bookings.map((booking) => ({
      _id: booking.id,
      pnr: booking.pnr,
      flightId: booking.flight
        ? {
            flightNumber: booking.flight.flightNumber,
            route: { from: booking.flight.routeFrom, to: booking.flight.routeTo },
            departureAt: booking.flight.departureAt,
          }
        : undefined,
      flightSnapshot: booking.flightSnapshot as unknown as FlightSnapshotJson,
      seats: booking.seats as unknown as Seat[],
      totalPrice: booking.totalPrice,
      travelClass: booking.travelClass,
      paymentStatus: booking.paymentStatus,
      kycStatus: booking.kycStatus,
      createdAt: booking.createdAt,
    })),
  );
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid booking payload." }, { status: 400 });
    }

    await connectToDatabase();
    const kyc = await runKycCheck(parsed.data.passenger);
    if (kyc.status === "failed") {
      return NextResponse.json({ error: kyc.reason || "KYC failed." }, { status: 400 });
    }

    const booking = await finalizeBooking({
      userId: auth.userId,
      flightId: parsed.data.flightId,
      travelClass: parsed.data.travelClass,
      seats: parsed.data.seats,
      passenger: parsed.data.passenger,
      paymentProvider: "simulated",
      paymentReference: `SIM-${Date.now()}`,
      kycStatus: kyc.status,
      kycReference: kyc.referenceId,
      flightSnapshot: parsed.data.flightSnapshot,
    });

    await prisma.payment.create({
      data: {
        userId: auth.userId,
        bookingId: booking.id,
        amount: booking.totalPrice,
        currency: "usd",
        method: "credit_card",
        provider: "simulated",
        status: "paid",
        reference: `SIM-${booking.id}`,
      },
    });

    return NextResponse.json(
      {
        message: "Booking confirmed.",
        bookingId: booking.id,
        pnr: booking.pnr,
        totalPrice: booking.totalPrice,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "PNR collision, retry booking." }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Failed to create booking.", details: String(error) },
      { status: 500 },
    );
  }
}
