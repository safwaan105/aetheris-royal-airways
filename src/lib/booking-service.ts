import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePnr } from "@/lib/pnr";
import { calculateDynamicPrice } from "@/lib/pricing";
import { sendBookingNotifications } from "@/lib/notifications";
import type { SeatClass, Seat } from "@/types";

interface BookingPassenger {
  fullName: string;
  passportNumber: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth: string;
  nationality: string;
  passportCountry: string;
  passportExpiry: string;
}

interface FlightSnapshotInput {
  flightNumber: string;
  airline: string;
  route: { from: string; to: string };
  departureAt: string;
  arrivalAt: string;
  basePrice: number;
}

interface BookingFlightSnapshot {
  flightNumber: string;
  airline: string;
  route: { from: string; to: string };
  departureAt: Date;
  arrivalAt: Date;
}

export async function quoteBooking(input: {
  flightId: string;
  travelClass: SeatClass;
  seats: Seat[];
  flightSnapshot?: FlightSnapshotInput;
}) {
  if (input.flightId.startsWith("AMADEUS_")) {
    if (!input.flightSnapshot) {
      throw new Error("Live GDS flights require flightSnapshot in payload.");
    }
    const totalPrice = Math.round(
      input.flightSnapshot.basePrice *
        (input.travelClass === "royal" ? 2.35 : input.travelClass === "business" ? 1.55 : 1) *
        Math.max(1, input.seats.length),
    );
    return {
      totalPrice,
      availableSeats: 9,
      flightDocumentId: null,
      flightSnapshot: {
        flightNumber: input.flightSnapshot.flightNumber,
        airline: input.flightSnapshot.airline,
        route: input.flightSnapshot.route,
        departureAt: new Date(input.flightSnapshot.departureAt),
        arrivalAt: new Date(input.flightSnapshot.arrivalAt),
      } satisfies BookingFlightSnapshot,
    };
  }

  const flight = await prisma.flight.findUnique({ where: { id: input.flightId } });
  if (!flight) {
    throw new Error("Flight not found.");
  }

  const seatIds = input.seats.map((seat) => seat.id);
  const availableSeatsForSelection = await prisma.seatInventory.count({
    where: {
      flightId: flight.id,
      seatId: { in: seatIds },
      status: "available",
    },
  });

  if (availableSeatsForSelection !== seatIds.length) {
    throw new Error("One or more selected seats are no longer available.");
  }

  const availableSeats = await prisma.seatInventory.count({
    where: {
      flightId: flight.id,
      status: "available",
    },
  });

  if (seatIds.length > availableSeats) {
    throw new Error("Not enough seats available.");
  }

  const totalPrice = calculateDynamicPrice({
    basePrice: flight.basePrice,
    departureAt: new Date(flight.departureAt),
    availableSeats,
    capacity: flight.capacity,
    seatClass: input.travelClass,
    seatsRequested: input.seats.length,
  });

  return {
    totalPrice,
    availableSeats,
    flightDocumentId: flight.id,
    flightSnapshot: {
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      route: { from: flight.routeFrom, to: flight.routeTo },
      departureAt: new Date(flight.departureAt),
      arrivalAt: new Date(flight.arrivalAt),
    } satisfies BookingFlightSnapshot,
  };
}

export async function finalizeBooking(input: {
  userId: string;
  flightId: string;
  travelClass: SeatClass;
  seats: Seat[];
  passenger: BookingPassenger;
  paymentProvider: "stripe" | "simulated";
  paymentReference?: string;
  kycStatus: "passed" | "manual_review" | "failed";
  kycReference?: string;
  flightSnapshot?: FlightSnapshotInput;
}) {
  if (input.kycStatus === "failed") {
    throw new Error("KYC failed. Booking cannot be confirmed.");
  }

  const quote = await quoteBooking({
    flightId: input.flightId,
    travelClass: input.travelClass,
    seats: input.seats,
    flightSnapshot: input.flightSnapshot,
  });

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        pnr: generatePnr(),
        flightId: quote.flightDocumentId || null,
        flightSnapshot: quote.flightSnapshot as unknown as Prisma.JsonObject,
        userId: input.userId,
        seats: input.seats.map((seat) => ({ ...seat, status: "reserved" })) as unknown as Prisma.JsonArray,
        totalPrice: quote.totalPrice,
        travelClass: input.travelClass,
        status: "confirmed",
        paymentStatus: "paid",
        paymentProvider: input.paymentProvider,
        paymentReference: input.paymentReference,
        kycStatus: input.kycStatus,
        kycReference: input.kycReference,
        passenger: input.passenger as unknown as Prisma.JsonObject,
      },
    });

    if (quote.flightDocumentId) {
      const selectedSeatIds = input.seats.map((seat) => seat.id);
      const lockResult = await tx.seatInventory.updateMany({
        where: {
          flightId: quote.flightDocumentId,
          seatId: { in: selectedSeatIds },
          status: "available",
        },
        data: { status: "reserved", bookingId: created.id },
      });

      if (lockResult.count !== selectedSeatIds.length) {
        throw new Error("Seat locking failed due to a race condition. Please retry.");
      }
    }

    return created;
  });

  const notificationText =
    `Royal booking confirmed. PNR ${booking.pnr}. ` +
    `${quote.flightSnapshot.route.from} to ${quote.flightSnapshot.route.to}. ` +
    `Total USD ${quote.totalPrice}.`;

  await sendBookingNotifications({
    toEmail: input.passenger.email,
    toPhone: input.passenger.phoneNumber,
    subject: `Aetheris Royal Booking Confirmed (${booking.pnr})`,
    text: notificationText,
  });

  return booking;
}
