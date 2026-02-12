import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFriendlyServerError } from "@/lib/errors";
import { signAuthToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth-cookie";
import { verifyLoginOtpChallenge } from "@/lib/otp";
import { verifyOtpSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid OTP payload." }, { status: 400 });
    }

    const challenge = await verifyLoginOtpChallenge({
      challengeId: parsed.data.challengeId,
      code: parsed.data.code,
    });

    const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role as "customer" | "admin",
    });

    const response = NextResponse.json({
      message: "Login successful.",
      user: { name: user.name, email: user.email, role: user.role },
    });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyServerError(error, "OTP verification failed.") },
      { status: 400 },
    );
  }
}
