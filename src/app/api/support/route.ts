import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser, isAdmin } from "@/lib/auth";
import { supportRequestSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();
  const items = await prisma.supportRequest.findMany({
    where: isAdmin(auth.role) ? undefined : { userId: auth.userId },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
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
    const parsed = supportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid support request payload." }, { status: 400 });
    }

    await connectToDatabase();
    const created = await prisma.supportRequest.create({
      data: {
        userId: auth.userId,
        subject: parsed.data.subject,
        message: parsed.data.message,
        status: "open",
      },
    });

    return NextResponse.json({ message: "Support request submitted.", id: created.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit support request.", details: String(error) }, { status: 500 });
  }
}
