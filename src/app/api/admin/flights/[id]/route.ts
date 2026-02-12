import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser, isAdmin } from "@/lib/auth";
import { addFlightSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth || !isAdmin(auth.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Flight id is required." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = addFlightSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid flight payload." }, { status: 400 });
    }

    await connectToDatabase();
    const updated = await prisma.flight.update({
      where: { id },
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

    return NextResponse.json({
      message: "Flight updated.",
      flight: {
        _id: updated.id,
        flightNumber: updated.flightNumber,
        airline: updated.airline,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update flight.", details: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth || !isAdmin(auth.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Flight id is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await prisma.flight.delete({ where: { id } });
    return NextResponse.json({ message: "Flight deleted." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete flight.", details: String(error) }, { status: 500 });
  }
}
