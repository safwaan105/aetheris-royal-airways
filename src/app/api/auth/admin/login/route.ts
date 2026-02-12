import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { resolveAuthStore } from "@/lib/auth-store";
import { getFriendlyServerError } from "@/lib/errors";
import { signAuthToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth-cookie";
import { adminLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid admin login payload." }, { status: 400 });
    }

    const authStore = await resolveAuthStore();
    const user = await authStore.findByEmail(parsed.data.email);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin account not found." }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: "admin",
    });

    const response = NextResponse.json({
      message: "Admin login successful.",
      user: { name: user.name, email: user.email, role: user.role },
    });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyServerError(error, "Admin login failed. Please try again.") },
      { status: 500 },
    );
  }
}
