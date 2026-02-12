import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { resolveAuthStore } from "@/lib/auth-store";
import { getFriendlyServerError } from "@/lib/errors";
import { signAuthToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth-cookie";
import { signupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signup payload." }, { status: 400 });
    }

    const authStore = await resolveAuthStore();

    const existingUser = await authStore.findByEmail(parsed.data.email);
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const firstUserCount = await authStore.countUsers();

    let user;
    try {
      user = await authStore.createUser({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: firstUserCount === 0 ? "admin" : "customer",
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json({ error: "Email already in use." }, { status: 409 });
      }
      throw error;
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      message: "Signup successful.",
      user: { name: user.name, email: user.email, role: user.role },
    });

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyServerError(error, "Signup failed. Please try again.") },
      { status: 500 },
    );
  }
}
