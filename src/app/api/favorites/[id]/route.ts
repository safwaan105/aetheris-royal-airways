import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Favorite id is required." }, { status: 400 });
  }

  await connectToDatabase();
  await prisma.favorite.deleteMany({
    where: {
      id,
      userId: auth.userId,
    },
  });

  return NextResponse.json({ message: "Favorite removed." });
}
