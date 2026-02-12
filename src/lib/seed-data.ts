export const demoFlights = [
  {
    flightNumber: "AR-777",
    airline: "Aetheris Royal",
    airlineImageUrl:
      "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=800&q=80",
    route: { from: "LHR", to: "DXB" },
    departureAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    arrivalAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 60 * 7),
    basePrice: 980,
    vesselType: "Boeing 787-9 Dreamliner",
    amenities: ["Spa", "Private Suite", "Wi-Fi"],
    capacity: 120,
  },
  {
    flightNumber: "AR-145",
    airline: "Aetheris Royal",
    airlineImageUrl:
      "https://images.unsplash.com/photo-1461237439866-5a557710c921?auto=format&fit=crop&w=800&q=80",
    route: { from: "JFK", to: "CDG" },
    departureAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 11),
    arrivalAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 11 + 1000 * 60 * 60 * 8),
    basePrice: 820,
    vesselType: "Airbus A350-900",
    amenities: ["Sky Lounge", "Wi-Fi", "Fine Dining"],
    capacity: 140,
  },
  {
    flightNumber: "AR-309",
    airline: "Aetheris Royal",
    airlineImageUrl:
      "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=800&q=80",
    route: { from: "SIN", to: "NRT" },
    departureAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18),
    arrivalAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18 + 1000 * 60 * 60 * 6),
    basePrice: 640,
    vesselType: "Boeing 777-300ER",
    amenities: ["Royal Beds", "Concierge", "Cinema Pods"],
    capacity: 132,
  },
];
