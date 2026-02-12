export type SeatClass = "royal" | "business" | "economy";

export type SeatStatus = "available" | "reserved";

export interface Seat {
  id: string;
  class: SeatClass;
  status: SeatStatus;
}

export interface FlightRoute {
  from: string;
  to: string;
}

export interface FlightApiResponse {
  _id: string;
  source?: "inventory" | "gds";
  flightNumber: string;
  airline: string;
  airlineImageUrl: string;
  route: FlightRoute;
  departureAt: string;
  arrivalAt: string;
  basePrice: number;
  vesselType: string;
  amenities: string[];
  capacity: number;
  availableSeats: number;
}

export interface BookingApiResponse {
  _id: string;
  pnr: string;
  flightId?: string;
  flightSnapshot?: {
    flightNumber: string;
    route: FlightRoute;
    departureAt: string;
    arrivalAt: string;
    airline: string;
  };
  userId: string;
  seats: Seat[];
  totalPrice: number;
  travelClass: SeatClass;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed";
  kycStatus: "pending" | "passed" | "failed" | "manual_review";
  passenger: {
    fullName: string;
    passportNumber: string;
    email: string;
    phoneNumber?: string;
    dateOfBirth: string;
    nationality: string;
    passportCountry: string;
    passportExpiry: string;
  };
  createdAt: string;
}
