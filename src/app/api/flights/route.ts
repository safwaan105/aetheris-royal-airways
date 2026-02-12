import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { initializeSeatInventoryForFlight } from "@/lib/seat-layout";
import { demoFlights } from "@/lib/seed-data";
import { searchAmadeusFlights } from "@/lib/amadeus";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const date = url.searchParams.get("date");
  const live = url.searchParams.get("live");
  const travelClass = url.searchParams.get("class");
  const adults = url.searchParams.get("adults");

  if (live === "1" && from && to && date) {
    try {
      const gdsFlights = await searchAmadeusFlights({
        from,
        to,
        date,
        travelClass: travelClass || undefined,
        adults: adults || undefined,
      });
      if (gdsFlights.length > 0) {
        return NextResponse.json(gdsFlights);
      }
    } catch {
      // Fall through to internal inventory if GDS call fails.
    }
  }

  await connectToDatabase();

  if ((await prisma.flight.count()) === 0) {
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
    const insertedFlights = await prisma.flight.findMany();
    for (const flight of insertedFlights) {
      await initializeSeatInventoryForFlight(flight.id, flight.capacity);
    }
  }

  const flights = await prisma.flight.findMany({
    where: {
      ...(from ? { routeFrom: from.toUpperCase() } : {}),
      ...(to ? { routeTo: to.toUpperCase() } : {}),
    },
    orderBy: { departureAt: "asc" },
  });

  const seatStats = await prisma.seatInventory.groupBy({
    by: ["flightId"],
    where: { status: "available" },
    _count: { _all: true },
  });

  const availableByFlight = new Map<string, number>(
    seatStats.map((entry) => [entry.flightId, entry._count._all]),
  );

  const hydrated = flights.map((flight) => ({
    _id: flight.id,
    source: "inventory" as const,
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
    availableSeats: availableByFlight.get(flight.id) ?? flight.capacity,
  }));

  return NextResponse.json(hydrated);
}
