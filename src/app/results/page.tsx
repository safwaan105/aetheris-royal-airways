"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { FlightSearchForm } from "@/components/FlightSearchForm";
import type { FlightApiResponse } from "@/types";

function hoursBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function durationMinutes(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen"><NavBar /><main className="app-shell mt-6">Loading...</main></div>}>
      <ResultsPageInner />
    </Suspense>
  );
}

function ResultsPageInner() {
  const params = useSearchParams();
  const from = (params.get("from") || "").toUpperCase();
  const to = (params.get("to") || "").toUpperCase();
  const departure = params.get("departure") || "";
  const passengers = params.get("passengers") || "1";
  const travelClass = params.get("class") || "economy";
  const tier = params.get("tier") || "standard";
  const [items, setItems] = useState<FlightApiResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCard, setActiveCard] = useState<string>("");
  const [favoriteBusyId, setFavoriteBusyId] = useState<string>("");

  useEffect(() => {
    if (!from || !to || !departure) {
      queueMicrotask(() => setItems([]));
      return;
    }

    const query = new URLSearchParams({
      from,
      to,
      date: departure,
      class: travelClass,
      adults: passengers,
    });

    queueMicrotask(() => setLoading(true));
    fetch(`/api/flights?${query.toString()}`)
      .then((response) => response.json())
      .then((data: FlightApiResponse[]) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [from, to, departure, travelClass, passengers]);

  useEffect(() => {
    if (!from || !to || !departure) return;
    fetch("/api/search-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        departure,
        passengers: Number(passengers || "1"),
        travelClass: travelClass === "royal" || travelClass === "business" ? travelClass : "economy",
        tier: tier === "luxury" ? "luxury" : "standard",
      }),
    }).catch(() => undefined);
  }, [from, to, departure, passengers, travelClass, tier]);

  async function saveFavorite(flight: FlightApiResponse) {
    setFavoriteBusyId(flight._id);
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flightId: flight._id,
        flightSnapshot: {
          _id: flight._id,
          flightNumber: flight.flightNumber,
          airline: flight.airline,
          airlineImageUrl: flight.airlineImageUrl,
          route: flight.route,
          departureAt: flight.departureAt,
          arrivalAt: flight.arrivalAt,
          basePrice: flight.basePrice,
          vesselType: flight.vesselType,
        },
      }),
    }).catch(() => undefined);
    setFavoriteBusyId("");
  }

  useEffect(() => {
    const poll = window.setInterval(() => {
      if (!from || !to || !departure) return;
      const query = new URLSearchParams({
        from,
        to,
        date: departure,
        class: travelClass,
        adults: passengers,
      });
      fetch(`/api/flights?${query.toString()}`)
        .then((response) => response.json())
        .then((data: FlightApiResponse[]) => setItems(data))
        .catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(poll);
  }, [from, to, departure, travelClass, passengers]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== "aetheris_flight_refresh") return;
      if (!from || !to || !departure) return;
      const query = new URLSearchParams({
        from,
        to,
        date: departure,
        class: travelClass,
        adults: passengers,
      });
      fetch(`/api/flights?${query.toString()}`)
        .then((response) => response.json())
        .then((data: FlightApiResponse[]) => setItems(data))
        .catch(() => undefined);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [from, to, departure, travelClass, passengers]);

  useEffect(() => {
    function onScroll() {
      const cards = document.querySelectorAll<HTMLElement>("[data-flight-card]");
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.82 && rect.bottom > 80) {
          setActiveCard(card.dataset.flightCard || "");
          break;
        }
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items.length]);

  const filtered = useMemo(
    () =>
      items.filter((flight) => {
        const flightDate = new Date(flight.departureAt).toISOString().slice(0, 10);
        return (!from || flight.route.from === from) && (!to || flight.route.to === to) && (!departure || flightDate === departure);
      }).sort((a, b) => {
        const aScore = a.basePrice + durationMinutes(a.departureAt, a.arrivalAt) * 0.2;
        const bScore = b.basePrice + durationMinutes(b.departureAt, b.arrivalAt) * 0.2;
        return aScore - bScore;
      }),
    [items, from, to, departure],
  );

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6 space-y-6">
        <section className="glass-panel p-5">
          <h1 className="section-title">Best Value Flights</h1>
          <p className="subtle mt-2">Auto-sorted by value and duration for clean decision making.</p>
          <div className="mt-5">
            <FlightSearchForm actionPath="/results" initial={{ from, to, departure, passengers, travelClass, tier }} />
          </div>
        </section>

        <section className="space-y-3">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <article key={idx} className="card p-4 md:p-5">
                  <div className="grid-12">
                    <div className="skeleton col-span-12 h-32 md:col-span-3" />
                    <div className="space-y-2 md:col-span-6">
                      <div className="skeleton h-5 w-48" />
                      <div className="skeleton h-4 w-72" />
                      <div className="skeleton h-4 w-52" />
                    </div>
                    <div className="skeleton col-span-12 h-14 md:col-span-3" />
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <article className="card p-5">
              <p className="text-base font-semibold text-[#d5e7ff]">No flights found for this search.</p>
              <p className="subtle mt-1">Try another date or route.</p>
            </article>
          )}

          {filtered.map((flight) => {
            const snapshot = {
              flightNumber: flight.flightNumber,
              airline: flight.airline,
              route: flight.route,
              departureAt: flight.departureAt,
              arrivalAt: flight.arrivalAt,
              basePrice: flight.basePrice,
            };
            const snapshotParam = encodeURIComponent(JSON.stringify(snapshot));
            const rowClass =
              tier === "luxury"
                ? "card-luxury p-4 md:p-5 card-scroll-glow"
                : "card p-4 md:p-5 card-scroll-glow";
            const inView = activeCard === flight._id;

            return (
              <article
                key={flight._id}
                data-flight-card={flight._id}
                className={`${rowClass} ${inView ? "in-view" : ""}`}
              >
                <div className="grid-12 items-center">
                  <div className={`relative col-span-12 overflow-hidden rounded-xl md:col-span-3 ${tier === "luxury" ? "h-40 border border-[#866b2f]" : "h-32 border border-[#2d3853]"}`}>
                    <Image src={flight.airlineImageUrl} alt={flight.airline} fill className="object-cover" loading="lazy" />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className={`text-xl font-extrabold ${tier === "luxury" ? "text-[#f7e5bc]" : "text-[#d9ecff]"}`}>{flight.flightNumber}</h2>
                      <span className={tier === "luxury" ? "chip-luxury" : "chip"}>{flight.airline}</span>
                    </div>
                    <div className={`mt-2 flex items-center gap-2 rounded-full px-3 py-1 text-sm ${tier === "luxury" ? "bg-[#16121a] text-[#e6d8b8]" : "bg-[#151f37] text-[#9dc4f3]"}`}>
                      <span className="font-bold">{flight.route.from}</span>
                      <div className={`relative h-0.5 flex-1 border-t border-dotted ${tier === "luxury" ? "border-[#9b834f]" : "border-[#4d6691]"}`}>
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] text-[#34e8ff]">{">"}</span>
                      </div>
                      <span className="font-bold">{flight.route.to}</span>
                    </div>
                    <p className={`mt-1 text-sm ${tier === "luxury" ? "text-[#ceb98d]" : "subtle"}`}>
                      {new Date(flight.departureAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {new Date(flight.arrivalAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" | "}
                      {hoursBetween(flight.departureAt, flight.arrivalAt)}
                    </p>
                  </div>

                  <div className="col-span-12 md:col-span-3">
                    <p className={`text-2xl font-extrabold ${tier === "luxury" ? "text-[#f0c86f]" : "text-[#72c7ff]"}`}>${flight.basePrice}</p>
                    <Link
                      href={`/ticket/${flight._id}?class=${encodeURIComponent(travelClass)}&passengers=${encodeURIComponent(passengers)}&tier=${encodeURIComponent(tier)}&snapshot=${snapshotParam}`}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-extrabold text-white hover:bg-[#1f1f1f]"
                    >
                      Booking Now
                    </Link>
                    <button
                      className="btn-secondary mt-2 w-full"
                      onClick={() => {
                        void saveFavorite(flight);
                      }}
                      disabled={favoriteBusyId === flight._id}
                    >
                      {favoriteBusyId === flight._id ? "Saving..." : "Add to Favourites"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
