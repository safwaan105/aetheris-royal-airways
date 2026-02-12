import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      pendingCheckoutId?: string;
      paymentMethod?: string;
      paymentReference?: string;
    };

    if (!body.pendingCheckoutId || !body.paymentReference) {
      return NextResponse.json(
        { error: "pendingCheckoutId and paymentReference are required." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const pending = await prisma.pendingCheckout.findFirst({
      where: {
        id: body.pendingCheckoutId,
        userId: auth.userId,
      },
    });

    if (!pending) {
      return NextResponse.json({ error: "Pending checkout not found." }, { status: 404 });
    }

    if (pending.bookingId) {
      return NextResponse.json(
        { error: "Booking already confirmed for this checkout." },
        { status: 400 },
      );
    }

    const method = body.paymentMethod || "upi";
    const reference = body.paymentReference.trim();
    if (reference.length < 6) {
      return NextResponse.json(
        { error: "Payment reference must be at least 6 characters." },
        { status: 400 },
      );
    }

    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: {
        provider: "manual_upi",
        paymentStatus: "submitted",
        paymentMethod: method,
      },
    });

    await prisma.payment.updateMany({
      where: { pendingCheckoutId: pending.id },
      data: {
        provider: "manual_upi",
        method,
        status: "pending",
        reference,
      },
    });

    return NextResponse.json({
      message: "Payment submitted for verification. Ticket will be issued only after admin approval.",
      pendingCheckoutId: pending.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to submit payment reference.", details: String(error) },
      { status: 500 },
    );
  }
}
