import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { prisma } from "@/lib/prisma";

function pseudoStatus(departureAt: Date) {
  const now = Date.now();
  const departureMs = departureAt.getTime();
  const diffHours = (departureMs - now) / (1000 * 60 * 60);

  if (diffHours < -1) return "Arrived";
  if (diffHours <= 0.4) return "Boarding";
  if (diffHours <= 3) return "On Time";
  if (diffHours <= 5) return "Gate Opens Soon";
  return "Scheduled";
}

export async function GET() {
  await connectToDatabase();
  const flights = await prisma.flight.findMany({
    orderBy: { departureAt: "asc" },
    take: 6,
  });

  const statuses = flights.map((flight) => ({
    flightNumber: flight.flightNumber,
    route: { from: flight.routeFrom, to: flight.routeTo },
    departureAt: flight.departureAt,
    status: pseudoStatus(new Date(flight.departureAt)),
  }));

  return NextResponse.json(statuses);
}
