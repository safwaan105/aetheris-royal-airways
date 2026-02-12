import { NextResponse } from "next/server";
import { resolveAuthStore } from "@/lib/auth-store";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const authStore = await resolveAuthStore();
  const user = await authStore.findById(auth.userId);

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: { name: user.name, email: user.email, role: user.role },
  });
}
