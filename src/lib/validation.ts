import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const adminLoginSchema = z.object({
  email: z.email().toLowerCase().regex(/@gmail\.com$/i),
  password: z.string().min(8),
});

export const verifyOtpSchema = z.object({
  challengeId: z.string().min(10),
  code: z.string().regex(/^\d{6}$/),
});

export const addFlightSchema = z.object({
  flightNumber: z.string().min(3),
  airline: z.string().min(2),
  airlineImageUrl: z.union([z.url(), z.string().regex(/^data:image\//)]),
  route: z.object({
    from: z.string().min(3).max(3),
    to: z.string().min(3).max(3),
  }),
  departureAt: z.string(),
  arrivalAt: z.string(),
  basePrice: z.number().min(10),
  vesselType: z.string().min(2),
  amenities: z.array(z.string()).default([]),
  capacity: z.number().int().min(10),
}).superRefine((value, ctx) => {
  const departureAt = new Date(value.departureAt);
  const arrivalAt = new Date(value.arrivalAt);

  if (Number.isNaN(departureAt.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "departureAt must be a valid datetime",
      path: ["departureAt"],
    });
  }

  if (Number.isNaN(arrivalAt.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "arrivalAt must be a valid datetime",
      path: ["arrivalAt"],
    });
  }

  if (!Number.isNaN(departureAt.getTime()) && !Number.isNaN(arrivalAt.getTime()) && arrivalAt <= departureAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "arrivalAt must be after departureAt",
      path: ["arrivalAt"],
    });
  }
});

const passengerSchema = z.object({
  fullName: z.string().min(2),
  passportNumber: z.string().regex(/^[A-Z0-9]{6,12}$/i),
  email: z.email(),
  phoneNumber: z.string().min(7).max(20).optional(),
  dateOfBirth: z.string(),
  nationality: z.string().length(2),
  passportCountry: z.string().length(2),
  passportExpiry: z.string(),
});

export const bookingSchema = z.object({
  flightId: z.string().min(5),
  travelClass: z.enum(["royal", "business", "economy"]),
  flightSnapshot: z
    .object({
      flightNumber: z.string().min(2),
      airline: z.string().min(2),
      route: z.object({
        from: z.string().length(3),
        to: z.string().length(3),
      }),
      departureAt: z.string(),
      arrivalAt: z.string(),
      basePrice: z.number().min(1),
    })
    .optional(),
  seats: z
    .array(
      z.object({
        id: z.string(),
        class: z.enum(["royal", "business", "economy"]),
        status: z.enum(["available", "reserved"]),
      }),
    )
    .min(1),
  passenger: passengerSchema,
});

export const checkoutSchema = bookingSchema;

export const favoriteSchema = z.object({
  flightId: z.string().optional(),
  flightSnapshot: z.object({
    _id: z.string(),
    flightNumber: z.string().min(2),
    airline: z.string().min(2),
    airlineImageUrl: z.string().min(3),
    route: z.object({
      from: z.string().length(3),
      to: z.string().length(3),
    }),
    departureAt: z.string(),
    arrivalAt: z.string(),
    basePrice: z.number().int().positive(),
    vesselType: z.string().min(2),
  }),
});

export const searchHistorySchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  departure: z.string().min(8),
  passengers: z.number().int().min(1).max(9),
  travelClass: z.enum(["royal", "business", "economy"]),
  tier: z.enum(["standard", "luxury"]),
});

export const supportRequestSchema = z.object({
  subject: z.string().min(4).max(120),
  message: z.string().min(10).max(4000),
});
