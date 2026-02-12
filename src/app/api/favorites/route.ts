import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { favoriteSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();
  const favorites = await prisma.favorite.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    favorites.map((item) => ({
      id: item.id,
      flightId: item.flightId,
      flightSnapshot: item.flightSnapshot,
      createdAt: item.createdAt,
    })),
  );
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = favoriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid favorite payload." }, { status: 400 });
    }

    await connectToDatabase();
    const flightId = parsed.data.flightId || parsed.data.flightSnapshot._id;

    const existing = await prisma.favorite.findFirst({
      where: {
        userId: auth.userId,
        ...(flightId.startsWith("AMADEUS_") ? {} : { flightId }),
      },
    });
    if (existing) {
      return NextResponse.json({ message: "Already in favorites.", id: existing.id });
    }

    const created = await prisma.favorite.create({
      data: {
        userId: auth.userId,
        flightId: flightId.startsWith("AMADEUS_") ? null : flightId,
        flightSnapshot: parsed.data.flightSnapshot,
      },
    });

    return NextResponse.json({ message: "Added to favorites.", id: created.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save favorite.", details: String(error) }, { status: 500 });
  }
}
