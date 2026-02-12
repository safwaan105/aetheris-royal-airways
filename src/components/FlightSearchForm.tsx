"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AIRPORT_OPTIONS } from "@/lib/airports";

interface FlightSearchFormProps {
  actionPath?: string;
  initial?: {
    from?: string;
    to?: string;
    departure?: string;
    passengers?: string;
    travelClass?: string;
    tier?: string;
  };
}

export function FlightSearchForm({ actionPath = "/results", initial }: FlightSearchFormProps) {
  const router = useRouter();
  const [from, setFrom] = useState(initial?.from || "");
  const [to, setTo] = useState(initial?.to || "");
  const [departure, setDeparture] = useState(initial?.departure || "");
  const [passengers, setPassengers] = useState(initial?.passengers || "1");
  const travelClass = initial?.travelClass || "economy";
  const [tier, setTier] = useState(initial?.tier || "standard");

  function parseAirport(value: string) {
    const trimmed = value.trim().toUpperCase();
    if (trimmed.length <= 3) return trimmed;
    const match = trimmed.match(/\(([^)]+)\)$/);
    return match?.[1] || trimmed.slice(0, 3);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const fromCode = parseAirport(from);
    const toCode = parseAirport(to);

    if (fromCode.length !== 3 || toCode.length !== 3 || !departure) {
      return;
    }

    const params = new URLSearchParams({
      from: fromCode,
      to: toCode,
      departure,
      passengers,
      class: travelClass,
      tier,
    });

    router.push(`${actionPath}?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="glass-panel p-4 md:p-5">
      <div className="grid-12">
        <label className="float-wrap col-span-12 md:col-span-3">
          <span className="float-label">FROM</span>
          <input
            list="airport-options"
            className="field"
            placeholder="City or airport"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            required
          />
        </label>
        <label className="float-wrap col-span-12 md:col-span-3">
          <span className="float-label">TO</span>
          <input
            list="airport-options"
            className="field"
            placeholder="City or airport"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            required
          />
        </label>
        <label className="float-wrap col-span-12 md:col-span-2">
          <span className="float-label">DATE</span>
          <input
            type="date"
            className="field"
            value={departure}
            onChange={(event) => setDeparture(event.target.value)}
            required
          />
        </label>
        <label className="float-wrap col-span-8 md:col-span-2">
          <span className="float-label">PASSENGERS</span>
          <select
            className="field"
            value={passengers}
            onChange={(event) => setPassengers(event.target.value)}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
          </select>
        </label>
        <div className="col-span-4 md:col-span-2">
          <button type="submit" className="btn-primary btn-shimmer h-[58px] w-full">
            Search Flights
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={tier === "standard" ? "chip" : "btn-secondary !min-h-9 !px-3 !py-1 text-xs"}
          onClick={() => setTier("standard")}
        >
          Standard
        </button>
        <button
          type="button"
          className={tier === "luxury" ? "chip-luxury" : "btn-secondary !min-h-9 !px-3 !py-1 text-xs"}
          onClick={() => setTier("luxury")}
        >
          Luxury
        </button>
      </div>

      <datalist id="airport-options">
        {AIRPORT_OPTIONS.map((airport) => (
          <option key={airport.code} value={`${airport.city} (${airport.code})`}>
            {airport.city}
          </option>
        ))}
      </datalist>
    </form>
  );
}
