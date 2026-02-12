"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { SeatSelector } from "@/components/SeatSelector";
import type { FlightApiResponse, Seat, SeatClass } from "@/types";

const FALLBACK_AIRLINE_IMAGE =
  "https://images.unsplash.com/photo-1540339832862-474599807836?auto=format&fit=crop&w=800&q=80";

function resolveAirlineImage(src: string) {
  try {
    const url = new URL(src);
    const isAllowedHost =
      url.protocol === "https:" &&
      (url.hostname === "images.unsplash.com" ||
        url.hostname === "c8.alamy.com" ||
        url.hostname.endsWith(".alamy.com"));
    return isAllowedHost ? src : FALLBACK_AIRLINE_IMAGE;
  } catch {
    return FALLBACK_AIRLINE_IMAGE;
  }
}

const seatClassLabels: Record<SeatClass, string> = {
  royal: "Royal",
  business: "First",
  economy: "Business",
};

function classMultiplier(value: SeatClass) {
  if (value === "royal") return 2.35;
  if (value === "business") return 1.55;
  return 1;
}

export function BookingWizard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [travelClass, setTravelClass] = useState<SeatClass>("economy");
  const [date, setDate] = useState("");
  const [flights, setFlights] = useState<FlightApiResponse[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightApiResponse | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [seatOptions, setSeatOptions] = useState<Seat[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ pnr: string; total: number } | null>(null);

  const [passengerName, setPassengerName] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportCountry, setPassportCountry] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [nationality, setNationality] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const redirectToAuth = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Best-effort cleanup only.
    }
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/auth?next=${encodeURIComponent(returnTo)}`;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (date) params.set("date", date);
    params.set("class", travelClass);

    fetch(`/api/flights?${params.toString()}`)
      .then((response) => response.json())
      .then((data: FlightApiResponse[]) => setFlights(data))
      .catch(() => setFlights([]));
  }, [from, to, date, travelClass]);

  useEffect(() => {
    if (!selectedFlight || selectedFlight.source === "gds") return;
    fetch(`/api/flights/${selectedFlight._id}/seats`)
      .then((response) => response.json())
      .then((data: Seat[]) => setSeatOptions(data))
      .catch(() => setSeatOptions([]));
  }, [selectedFlight]);

  const filteredFlights = useMemo(
    () =>
      flights.filter((flight) => {
        const routeMatch =
          (!from || flight.route.from.toLowerCase() === from.toLowerCase()) &&
          (!to || flight.route.to.toLowerCase() === to.toLowerCase());
        if (!date) return routeMatch;
        return routeMatch && new Date(flight.departureAt).toISOString().slice(0, 10) === date;
      }),
    [flights, from, to, date],
  );

  const effectiveSeatOptions = useMemo(() => {
    if (selectedFlight?.source !== "gds") return seatOptions;
    return Array.from({ length: 30 }, (_, idx) => {
      const row = Math.floor(idx / 6) + 1;
      const col = ["A", "B", "C", "D", "E", "F"][idx % 6];
      const seatClass = idx < 6 ? "royal" : idx < 16 ? "business" : "economy";
      return {
        id: `${row}${col}`,
        class: seatClass as SeatClass,
        status: "available" as const,
      };
    });
  }, [seatOptions, selectedFlight?.source]);

  const estimatedTotal = useMemo(() => {
    if (!selectedFlight) return 0;
    return Math.round(selectedFlight.basePrice * classMultiplier(travelClass) * Math.max(1, selectedSeats.length));
  }, [selectedFlight, selectedSeats.length, travelClass]);

  function toggleSeat(seat: Seat) {
    setSelectedSeats((current) =>
      current.some((item) => item.id === seat.id)
        ? current.filter((item) => item.id !== seat.id)
        : [...current, seat],
    );
  }

  async function handleBooking() {
    if (!selectedFlight) return;
    setBusy(true);
    setMessage(null);

    const payload = {
      flightId: selectedFlight._id,
      travelClass,
      seats: selectedSeats.map((seat) => ({ ...seat, class: travelClass })),
      flightSnapshot:
        selectedFlight.source === "gds"
          ? {
              flightNumber: selectedFlight.flightNumber,
              airline: selectedFlight.airline,
              route: selectedFlight.route,
              departureAt: selectedFlight.departureAt,
              arrivalAt: selectedFlight.arrivalAt,
              basePrice: selectedFlight.basePrice,
            }
          : undefined,
      passenger: {
        fullName: passengerName,
        email: passengerEmail,
        phoneNumber: passengerPhone || undefined,
        passportNumber,
        passportCountry,
        passportExpiry,
        nationality,
        dateOfBirth,
      },
    };

    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.status === 401) {
      setBusy(false);
      setMessage("Your session expired. Please login again.");
      void redirectToAuth();
      return;
    }
    const data = await response.json();
    if (!response.ok) {
      setBusy(false);
      setMessage(data.error || "Checkout failed.");
      return;
    }

    if ((data.mode === "stripe" || data.mode === "upi_auto") && data.checkoutUrl) {
      const paymentParams = new URLSearchParams({
        mode: String(data.mode),
        amount: String(data.amount || ""),
        pendingCheckoutId: String(data.pendingCheckoutId || ""),
        checkoutUrl: String(data.checkoutUrl || ""),
        sessionId: String(data.sessionId || ""),
        tier: "standard",
      });
      window.location.href = `/payment?${paymentParams.toString()}`;
      return;
    }

    setBusy(false);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="glass-panel rounded-[1.6rem] p-5 md:p-6">
        <h2 className="royal-text text-3xl text-[#FFD700]">Book In 3 Easy Steps</h2>
        <p className="mt-2 text-sm text-[#e4dcff]">Search route, pick a flight, choose seats, and confirm your ticket.</p>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <input
            value={from}
            onChange={(event) => setFrom(event.target.value.toUpperCase())}
            placeholder="From"
            className="input-royal px-4 py-3"
          />
          <input
            value={to}
            onChange={(event) => setTo(event.target.value.toUpperCase())}
            placeholder="To"
            className="input-royal px-4 py-3"
          />
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="input-royal px-4 py-3" />
          <select
            value={travelClass}
            onChange={(event) => setTravelClass(event.target.value as SeatClass)}
            className="input-royal px-4 py-3"
          >
            <option value="royal">Royal</option>
            <option value="business">First</option>
            <option value="economy">Business</option>
          </select>
        </div>

        <div className="mt-5 space-y-3">
          {filteredFlights.length === 0 && (
            <p className="rounded-xl border border-[#FF00FF]/30 bg-[rgba(255,0,255,0.08)] p-3 text-sm text-[#ffd7ff]">
              No flights found. Try different city codes or date.
            </p>
          )}
          {filteredFlights.map((flight) => {
            const isActive = selectedFlight?._id === flight._id;
            return (
              <button
                key={flight._id}
                onClick={() => {
                  setSelectedFlight(flight);
                  setSelectedSeats([]);
                }}
                className={`w-full overflow-hidden rounded-2xl border text-left transition ${isActive ? "border-[#FFD700] bg-[rgba(255,215,0,0.11)] neon-outline" : "border-white/15 bg-[rgba(8,14,32,0.7)]"}`}
              >
                <div className="grid gap-3 p-3 md:grid-cols-[130px_1fr]">
                  <div className="relative h-24 overflow-hidden rounded-xl">
                    <Image src={resolveAirlineImage(flight.airlineImageUrl)} alt={flight.airline} fill className="object-cover" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-lg font-semibold text-[#fff1be]">{flight.flightNumber}</p>
                      <p className="rounded-full border border-[#FF00FF]/40 px-2 py-1 text-xs text-[#ff9eff]">
                        {seatClassLabels[travelClass]}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-[#d7e0ff]">
                      {flight.route.from} to {flight.route.to} | {new Date(flight.departureAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm text-[#FFD700]">
                      ${flight.basePrice} base | {flight.availableSeats} seats left
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedFlight && (
          <div className="mt-6 grid gap-4">
            <SeatSelector seats={effectiveSeatOptions} selected={selectedSeats} onToggle={toggleSeat} />
            <div className="grid gap-3 md:grid-cols-2">
              <input value={passengerName} onChange={(event) => setPassengerName(event.target.value)} placeholder="Passenger Full Name" className="input-royal px-4 py-3" />
              <input value={passengerEmail} onChange={(event) => setPassengerEmail(event.target.value)} placeholder="Passenger Email" className="input-royal px-4 py-3" />
              <input value={passengerPhone} onChange={(event) => setPassengerPhone(event.target.value)} placeholder="Phone (optional)" className="input-royal px-4 py-3" />
              <input value={passportNumber} onChange={(event) => setPassportNumber(event.target.value.toUpperCase())} placeholder="Passport Number" className="input-royal px-4 py-3" />
              <input value={passportCountry} onChange={(event) => setPassportCountry(event.target.value.toUpperCase())} placeholder="Passport Country (2 letters)" className="input-royal px-4 py-3" />
              <input value={nationality} onChange={(event) => setNationality(event.target.value.toUpperCase())} placeholder="Nationality (2 letters)" className="input-royal px-4 py-3" />
              <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className="input-royal px-4 py-3" />
              <input type="date" value={passportExpiry} onChange={(event) => setPassportExpiry(event.target.value)} className="input-royal px-4 py-3" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#f5deff]">Estimated Total: ${estimatedTotal}</p>
              <button
                onClick={handleBooking}
                disabled={busy || selectedSeats.length === 0}
                className="neo-button rounded-full px-6 py-3 text-sm font-semibold tracking-wide text-[#FFD700] disabled:opacity-50"
              >
                {busy ? "Confirming..." : "Book Ticket"}
              </button>
            </div>
          </div>
        )}
        {message && <p className="mt-4 text-sm text-[#ff9ce8]">{message}</p>}
      </div>

      <aside className="glass-panel rounded-[1.6rem] p-5">
        <h3 className="royal-text text-2xl text-[#FFD700]">Passenger Quick Guide</h3>
        <ol className="mt-4 space-y-3 text-sm text-[#dfd8ff]">
          <li className="rounded-xl border border-white/10 bg-[rgba(8,14,30,0.72)] p-3">1. Enter route and travel date.</li>
          <li className="rounded-xl border border-white/10 bg-[rgba(8,14,30,0.72)] p-3">2. Choose a boarding pass and seats.</li>
          <li className="rounded-xl border border-white/10 bg-[rgba(8,14,30,0.72)] p-3">3. Fill passenger details and confirm.</li>
        </ol>
        <p className="mt-4 rounded-xl border border-[#FF00FF]/30 bg-[rgba(255,0,255,0.08)] p-3 text-xs text-[#ffd8ff]">
          Every confirmed booking generates a unique 6-character PNR and appears in My Bookings.
        </p>
      </aside>

      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4"
          >
            <motion.div
              initial={{ scale: 0.88, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel neon-outline w-full max-w-md rounded-2xl p-6 text-center"
            >
              <p className="text-xs tracking-[0.24em] text-[#FF00FF]">TICKET CONFIRMED</p>
              <h4 className="royal-text mt-2 text-3xl text-[#FFD700]">Aetheris Royal</h4>
              <p className="mt-3 text-sm text-[#ecddff]">PNR: {confirmModal.pnr}</p>
              <p className="mt-1 text-sm text-[#ecddff]">Total Paid: ${confirmModal.total}</p>
              <button
                onClick={() => setConfirmModal(null)}
                className="neo-button mt-5 rounded-full px-5 py-2 text-sm text-[#FFD700]"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
