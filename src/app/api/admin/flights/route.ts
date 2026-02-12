import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser, isAdmin } from "@/lib/auth";
import { initializeSeatInventoryForFlight } from "@/lib/seat-layout";
import { addFlightSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth || !isAdmin(auth.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();
  const flights = await prisma.flight.findMany({ orderBy: { departureAt: "asc" } });

  const availableCounts = await prisma.seatInventory.groupBy({
    by: ["flightId"],
    where: { status: "available" },
    _count: { _all: true },
  });
  const availableMap = new Map(availableCounts.map((item) => [item.flightId, item._count._all]));

  return NextResponse.json(
    flights.map((flight) => ({
      _id: flight.id,
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
      availableSeats: availableMap.get(flight.id) ?? flight.capacity,
    })),
  );
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth || !isAdmin(auth.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = addFlightSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid flight payload." }, { status: 400 });
    }

    await connectToDatabase();

    const flight = await prisma.flight.create({
      data: {
        flightNumber: parsed.data.flightNumber,
        airline: parsed.data.airline,
        airlineImageUrl: parsed.data.airlineImageUrl,
        routeFrom: parsed.data.route.from.toUpperCase(),
        routeTo: parsed.data.route.to.toUpperCase(),
        departureAt: new Date(parsed.data.departureAt),
        arrivalAt: new Date(parsed.data.arrivalAt),
        basePrice: parsed.data.basePrice,
        vesselType: parsed.data.vesselType,
        amenities: parsed.data.amenities,
        capacity: parsed.data.capacity,
      },
    });
    await initializeSeatInventoryForFlight(flight.id, flight.capacity);

    return NextResponse.json(
      {
        message: "Flight added.",
        flight: {
          _id: flight.id,
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
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add flight.", details: String(error) },
      { status: 500 },
    );
  }
}
