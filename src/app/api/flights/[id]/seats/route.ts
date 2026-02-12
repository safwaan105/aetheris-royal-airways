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
  const seats = await prisma.seatInventory.findMany({
    where: { flightId: id },
    orderBy: { seatId: "asc" },
    select: { seatId: true, seatClass: true, status: true },
  });

  return NextResponse.json(
    seats.map((seat) => ({
      id: seat.seatId,
      class: seat.seatClass,
      status: seat.status,
    })),
  );
}
