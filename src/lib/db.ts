import { prisma } from "@/lib/prisma";

export async function connectToDatabase() {
  await prisma.$queryRaw`SELECT 1`;
  return prisma;
}
