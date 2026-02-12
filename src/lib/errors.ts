export function getFriendlyServerError(error: unknown, fallback: string) {
  const message = String(error ?? "");
  const lowered = message.toLowerCase();

  if (lowered.includes("database") || lowered.includes("prisma")) {
    return "Database connection failed. Verify DATABASE_URL and run Prisma migration.";
  }

  return fallback;
}
