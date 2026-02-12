import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth || !isAdmin(auth.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      flight: { select: { flightNumber: true, routeFrom: true, routeTo: true } },
    },
    take: 200,
  });

  return NextResponse.json(
    bookings.map((booking) => ({
      id: booking.id,
      pnr: booking.pnr,
      createdAt: booking.createdAt,
      totalPrice: booking.totalPrice,
      travelClass: booking.travelClass,
      paymentStatus: booking.paymentStatus,
      user: booking.user,
      flight: booking.flight
        ? {
            flightNumber: booking.flight.flightNumber,
            from: booking.flight.routeFrom,
            to: booking.flight.routeTo,
          }
        : null,
    })),
  );
}
