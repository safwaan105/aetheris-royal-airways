import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchRazorpayPaymentLink } from "@/lib/razorpay";
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

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const pendingCheckoutId = url.searchParams.get("pendingCheckoutId");
  if (!pendingCheckoutId) {
    return NextResponse.json({ error: "pendingCheckoutId is required." }, { status: 400 });
  }

  await connectToDatabase();

  const pending = await prisma.pendingCheckout.findFirst({
    where: { id: pendingCheckoutId, userId: auth.userId },
  });
  if (!pending) {
    return NextResponse.json({ error: "Pending checkout not found." }, { status: 404 });
  }

  if (pending.bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: pending.bookingId } });
    return NextResponse.json({
      status: "paid",
      bookingId: booking?.id,
      pnr: booking?.pnr,
      totalPrice: booking?.totalPrice,
    });
  }

  if (pending.provider === "razorpay" && pending.paymentSessionId) {
    try {
      const link = await fetchRazorpayPaymentLink(pending.paymentSessionId);
      if (link.status === "paid") {
        const booking = await finalizeBooking({
          userId: pending.userId,
          flightId: pending.flightId,
          travelClass: pending.travelClass as SeatClass,
          seats: pending.seats as unknown as Seat[],
          passenger: pending.passenger as unknown as PassengerJson,
          paymentProvider: "simulated",
          paymentReference: link.id || pending.paymentSessionId,
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
            reference: link.id || pending.paymentSessionId,
          },
        });

        return NextResponse.json({
          status: "paid",
          bookingId: booking.id,
          pnr: booking.pnr,
          totalPrice: booking.totalPrice,
        });
      }
    } catch {
      // If gateway lookup fails, keep pending and let webhook retry.
    }
  }

  return NextResponse.json({
    status: pending.paymentStatus || "pending",
  });
}
