import type { SeatClass } from "@/types";

const CLASS_MULTIPLIER: Record<SeatClass, number> = {
  royal: 2.35,
  business: 1.55,
  economy: 1,
};

export function calculateDynamicPrice({
  basePrice,
  departureAt,
  availableSeats,
  capacity,
  seatClass,
  seatsRequested,
}: {
  basePrice: number;
  departureAt: Date;
  availableSeats: number;
  capacity: number;
  seatClass: SeatClass;
  seatsRequested: number;
}) {
  const now = new Date();
  const diffMs = departureAt.getTime() - now.getTime();
  const daysToDeparture = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  const urgencyFactor = daysToDeparture <= 7 ? 1.25 : daysToDeparture <= 21 ? 1.12 : 1;
  const loadFactor = 1 + Math.max(0, 1 - availableSeats / Math.max(capacity, 1)) * 0.25;
  const classMultiplier = CLASS_MULTIPLIER[seatClass];
  const subtotal = basePrice * classMultiplier * urgencyFactor * loadFactor * seatsRequested;
  return Math.round(subtotal);
}
