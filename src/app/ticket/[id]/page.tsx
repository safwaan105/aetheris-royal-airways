"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import type { FlightApiResponse } from "@/types";

function getDuration(start: string, end: string) {
  const mins = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function TicketDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen"><NavBar /><main className="app-shell mt-6">Loading ticket...</main></div>}>
      <TicketDetailsPageInner />
    </Suspense>
  );
}

function TicketDetailsPageInner() {
  const routeParams = useParams<{ id: string }>();
  const query = useSearchParams();
  const flightId = routeParams.id;
  const travelClass = query.get("class") || "economy";
  const passengers = query.get("passengers") || "1";
  const tier = query.get("tier") || "standard";
  const snapshotParam = query.get("snapshot");
  const [flight, setFlight] = useState<FlightApiResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const snapshot = useMemo(() => {
    if (!snapshotParam) return null;
    try {
      return JSON.parse(decodeURIComponent(snapshotParam)) as {
        flightNumber: string;
        airline: string;
        route: { from: string; to: string };
        departureAt: string;
        arrivalAt: string;
        basePrice: number;
      };
    } catch {
      return null;
    }
  }, [snapshotParam]);

  useEffect(() => {
    if (!flightId) return;

    if (flightId.startsWith("AMADEUS_") && snapshot) {
      queueMicrotask(() => {
        setFlight({
          _id: flightId,
          source: "gds",
          flightNumber: snapshot.flightNumber,
          airline: snapshot.airline,
          airlineImageUrl: "https://images.unsplash.com/photo-1540339832862-474599807836?auto=format&fit=crop&w=1200&q=80",
          route: snapshot.route,
          departureAt: snapshot.departureAt,
          arrivalAt: snapshot.arrivalAt,
          basePrice: snapshot.basePrice,
          vesselType: "Commercial Jet",
          amenities: ["Live Fare"],
          capacity: 200,
          availableSeats: 9,
        });
        setLoading(false);
      });
      return;
    }

    queueMicrotask(() => setLoading(true));
    fetch(`/api/flights/${flightId}`)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Flight not found.");
        }
        return response.json();
      })
      .then((data: FlightApiResponse) => setFlight(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [flightId, snapshot]);

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <section className={tier === "luxury" ? "card-luxury p-6 md:p-8" : "card p-6 md:p-8"}>
          <h1 className="section-title">Ticket Details</h1>
          {loading && (
            <div className="mt-4 grid gap-5 md:grid-cols-[280px_1fr]">
              <div className="skeleton h-52" />
              <div className="space-y-2">
                <div className="skeleton h-6 w-52" />
                <div className="skeleton h-4 w-64" />
                <div className="skeleton h-4 w-56" />
                <div className="skeleton h-10 w-44" />
              </div>
            </div>
          )}
          {error && <p className="status-err mt-3">{error}</p>}

          {flight && (
            <div className="mt-5 grid gap-5 md:grid-cols-[280px_1fr]">
              <div className={`relative h-52 overflow-hidden rounded-xl ${tier === "luxury" ? "border border-[#866b2f]" : "border border-[#d6e2f2] bg-[#eef5ff]"}`}>
                <Image src={flight.airlineImageUrl} alt={flight.airline} fill className="object-cover" />
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={`text-2xl font-extrabold ${tier === "luxury" ? "text-[#f7e5bc]" : "text-[#12345d]"}`}>{flight.flightNumber}</h2>
                  <span className={tier === "luxury" ? "chip-luxury" : "chip"}>{flight.airline}</span>
                </div>
                <p className={`text-lg font-semibold ${tier === "luxury" ? "text-[#e9d9b5]" : "text-[#1f4676]"}`}>
                  {flight.route.from} to {flight.route.to}
                </p>
                <p className={tier === "luxury" ? "text-[#d7c59e]" : "subtle"}>
                  Departure: {new Date(flight.departureAt).toLocaleString()}
                  <br />
                  Arrival: {new Date(flight.arrivalAt).toLocaleString()}
                  <br />
                  Duration: {getDuration(flight.departureAt, flight.arrivalAt)}
                </p>
                <p className={`text-xl font-extrabold ${tier === "luxury" ? "text-[#f0c86f]" : "text-[#0f5cc0]"}`}>
                  ${flight.basePrice} per passenger
                </p>
                <p className={tier === "luxury" ? "text-[#d7c59e]" : "subtle"}>
                  Class: {travelClass} | Passengers: {passengers} | Seats available: {flight.availableSeats}
                </p>
                {tier === "luxury" && (
                  <p className="text-sm text-[#e8d5ab]">
                    VIP amenities: {flight.amenities.slice(0, 4).join(" • ") || "Private Transfer • Lounge • Concierge"}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link href="/results" className="btn-secondary min-w-36">
                    Back to Results
                  </Link>
                  <Link
                    href={`/checkout?flightId=${encodeURIComponent(flight._id)}&class=${encodeURIComponent(travelClass)}&passengers=${encodeURIComponent(passengers)}&tier=${encodeURIComponent(tier)}&snapshot=${encodeURIComponent(snapshotParam || "")}`}
                    className={tier === "luxury" ? "btn-luxury min-w-56" : "btn-primary min-w-56"}
                  >
                    Continue to Checkout
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
