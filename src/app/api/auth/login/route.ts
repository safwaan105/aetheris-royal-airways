import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { resolveAuthStore } from "@/lib/auth-store";
import { getFriendlyServerError } from "@/lib/errors";
import { createLoginOtpChallenge } from "@/lib/otp";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
    }

    const authStore = await resolveAuthStore();
    const user = await authStore.findByEmail(parsed.data.email);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const challenge = await createLoginOtpChallenge({
      userId: user.id,
      email: user.email,
      purpose: "login",
    });

    return NextResponse.json({
      message: "OTP sent to your email.",
      otpRequired: true,
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyServerError(error, "Login failed. Please try again.") },
      { status: 500 },
    );
  }
}
