import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/jwt";

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

export function isAdmin(role?: string) {
  return role === "admin";
}
