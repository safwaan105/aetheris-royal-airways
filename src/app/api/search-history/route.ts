import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { searchHistorySchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();
  const items = await prisma.searchHistory.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = searchHistorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid search history payload." }, { status: 400 });
    }

    await connectToDatabase();
    await prisma.searchHistory.create({
      data: {
        userId: auth.userId,
        fromCode: parsed.data.from.toUpperCase(),
        toCode: parsed.data.to.toUpperCase(),
        departureDate: parsed.data.departure,
        passengers: parsed.data.passengers,
        travelClass: parsed.data.travelClass,
        tier: parsed.data.tier,
      },
    });

    return NextResponse.json({ message: "Search history saved." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save search history.", details: String(error) }, { status: 500 });
  }
}
