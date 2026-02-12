import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSimpleTicketPdf } from "@/lib/pdf";
import type { Seat } from "@/types";

interface FlightSnapshot {
  flightNumber: string;
  airline: string;
  route: { from: string; to: string };
  departureAt: string;
  arrivalAt: string;
}

interface PassengerSnapshot {
  fullName: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Booking id required." }, { status: 400 });
  }

  await connectToDatabase();
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.userId !== auth.userId && !isAdmin(auth.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const snapshot = booking.flightSnapshot as unknown as FlightSnapshot;
  const passenger = booking.passenger as unknown as PassengerSnapshot;
  const seats = booking.seats as unknown as Seat[];
  const qrPayload = `BOOKING:${booking.id}|PNR:${booking.pnr}|USER:${booking.user.email}`;

  const pdf = buildSimpleTicketPdf([
    "AETHERIS AIRWAYS E-TICKET",
    "----------------------------------------",
    `Booking ID: ${booking.id}`,
    `PNR: ${booking.pnr}`,
    `Passenger: ${passenger?.fullName || booking.user.name}`,
    `Flight: ${snapshot.flightNumber} - ${snapshot.airline}`,
    `Route: ${snapshot.route.from} -> ${snapshot.route.to}`,
    `Departure: ${new Date(snapshot.departureAt).toLocaleString()}`,
    `Arrival: ${new Date(snapshot.arrivalAt).toLocaleString()}`,
    `Seats: ${seats.map((seat) => seat.id).join(", ") || "N/A"}`,
    `Class: ${booking.travelClass}`,
    `Total Paid: $${booking.totalPrice}`,
    `Issued: ${new Date(booking.createdAt).toLocaleString()}`,
    `QR Payload: ${qrPayload}`,
    "----------------------------------------",
    "Show this ticket at check-in.",
  ]);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Aetheris-Ticket-${booking.pnr}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
