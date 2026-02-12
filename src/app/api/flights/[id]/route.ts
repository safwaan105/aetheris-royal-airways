import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Flight id is required." }, { status: 400 });
  }

  await connectToDatabase();
  const flight = await prisma.flight.findUnique({ where: { id } });

  if (!flight) {
    return NextResponse.json({ error: "Flight not found." }, { status: 404 });
  }

  const availableSeats = await prisma.seatInventory.count({
    where: { flightId: flight.id, status: "available" },
  });

  return NextResponse.json({
    _id: flight.id,
    source: "inventory",
    flightNumber: flight.flightNumber,
    airline: flight.airline,
    airlineImageUrl: flight.airlineImageUrl,
    route: { from: flight.routeFrom, to: flight.routeTo },
    departureAt: flight.departureAt,
    arrivalAt: flight.arrivalAt,
    basePrice: flight.basePrice,
    vesselType: flight.vesselType,
    amenities: flight.amenities,
    capacity: flight.capacity,
    availableSeats,
  });
}
