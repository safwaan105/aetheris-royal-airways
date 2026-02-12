import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { initializeSeatInventoryForFlight } from "@/lib/seat-layout";
import { demoFlights } from "@/lib/seed-data";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await connectToDatabase();

  await prisma.seatInventory.deleteMany({});
  await prisma.pendingCheckout.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.flight.deleteMany({});

  await prisma.flight.createMany({
    data: demoFlights.map((flight) => ({
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      airlineImageUrl: flight.airlineImageUrl,
      routeFrom: flight.route.from,
      routeTo: flight.route.to,
      departureAt: new Date(flight.departureAt),
      arrivalAt: new Date(flight.arrivalAt),
      basePrice: flight.basePrice,
      vesselType: flight.vesselType,
      amenities: flight.amenities,
      capacity: flight.capacity,
    })),
  });

  const inserted = await prisma.flight.findMany();
  for (const flight of inserted) {
    await initializeSeatInventoryForFlight(flight.id, flight.capacity);
  }

  return NextResponse.json({ message: "Seed complete.", count: inserted.length });
}
