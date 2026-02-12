import type { FlightApiResponse } from "@/types";

let amadeusTokenCache: { token: string; expiresAt: number } | null = null;

async function getAmadeusToken() {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }

  if (amadeusTokenCache && Date.now() < amadeusTokenCache.expiresAt - 60_000) {
    return amadeusTokenCache.token;
  }

  const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Amadeus token.");
  }

  const payload = (await response.json()) as { access_token: string; expires_in: number };
  amadeusTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };

  return payload.access_token;
}

export async function searchAmadeusFlights(params: {
  from: string;
  to: string;
  date: string;
  travelClass?: string;
  adults?: string;
}): Promise<FlightApiResponse[]> {
  const token = await getAmadeusToken();
  if (!token) {
    return [];
  }

  const query = new URLSearchParams({
    originLocationCode: params.from.toUpperCase(),
    destinationLocationCode: params.to.toUpperCase(),
    departureDate: params.date,
    adults: params.adults || "1",
    max: "10",
    ...(params.travelClass && params.travelClass !== "all"
      ? { travelClass: params.travelClass.toUpperCase() }
      : {}),
  });

  const response = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch flight offers from Amadeus.");
  }

  const payload = (await response.json()) as {
    data: Array<{
      id: string;
      itineraries: Array<{
        segments: Array<{
          departure: { iataCode: string; at: string };
          arrival: { iataCode: string; at: string };
          carrierCode: string;
          number: string;
          aircraft?: { code?: string };
        }>;
      }>;
      validatingAirlineCodes?: string[];
      numberOfBookableSeats?: number;
      price: { total: string };
    }>;
  };

  return payload.data.map((offer) => {
    const firstItinerary = offer.itineraries[0];
    const firstSegment = firstItinerary?.segments[0];
    const lastSegment = firstItinerary?.segments[firstItinerary.segments.length - 1];
    const airlineCode = offer.validatingAirlineCodes?.[0] || firstSegment?.carrierCode || "AIR";
    const flightNumber = firstSegment ? `${firstSegment.carrierCode}-${firstSegment.number}` : `AM-${offer.id}`;

    return {
      _id: `AMADEUS_${offer.id}`,
      source: "gds",
      flightNumber,
      airline: airlineCode,
      airlineImageUrl:
        "https://images.unsplash.com/photo-1540339832862-474599807836?auto=format&fit=crop&w=800&q=80",
      route: {
        from: firstSegment?.departure.iataCode || params.from,
        to: lastSegment?.arrival.iataCode || params.to,
      },
      departureAt: firstSegment?.departure.at || new Date().toISOString(),
      arrivalAt: lastSegment?.arrival.at || new Date().toISOString(),
      basePrice: Number(offer.price.total),
      vesselType: firstSegment?.aircraft?.code || "Commercial Jet",
      amenities: ["Live GDS Offer", "Dynamic Fare"],
      capacity: 200,
      availableSeats: offer.numberOfBookableSeats ?? 6,
    };
  });
}
