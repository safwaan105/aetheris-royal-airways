import { prisma } from "@/lib/prisma";
import type { SeatClass } from "@/types";

const seatColumns = ["A", "B", "C", "D", "E", "F"];

function classForPosition(index: number, total: number): SeatClass {
  const royalLimit = Math.max(4, Math.floor(total * 0.15));
  const businessLimit = Math.max(royalLimit + 8, Math.floor(total * 0.45));
  if (index < royalLimit) return "royal";
  if (index < businessLimit) return "business";
  return "economy";
}

export function generateSeatLayout(capacity: number) {
  return Array.from({ length: capacity }, (_, index) => {
    const row = Math.floor(index / seatColumns.length) + 1;
    const col = seatColumns[index % seatColumns.length];
    return {
      seatId: `${row}${col}`,
      seatClass: classForPosition(index, capacity),
      status: "available" as const,
    };
  });
}

export async function initializeSeatInventoryForFlight(flightId: string, capacity: number) {
  const existingCount = await prisma.seatInventory.count({ where: { flightId } });
  if (existingCount > 0) return;

  await prisma.seatInventory.createMany({
    data: generateSeatLayout(capacity).map((seat) => ({
      flightId,
      seatId: seat.seatId,
      seatClass: seat.seatClass,
      status: seat.status,
    })),
  });
}
