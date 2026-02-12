import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth || !isAdmin(auth.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Support request id is required." }, { status: 400 });
  }

  const body = (await request.json()) as { status?: string };
  const status = body.status === "resolved" ? "resolved" : body.status === "open" ? "open" : null;
  if (!status) {
    return NextResponse.json({ error: "Status must be open or resolved." }, { status: 400 });
  }

  await connectToDatabase();
  const updated = await prisma.supportRequest.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json({ message: "Support status updated.", item: updated });
}
