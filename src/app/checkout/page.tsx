"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import type { Seat, SeatClass } from "@/types";

interface SeatItem {
  id: string;
  class: SeatClass;
  status: "available" | "reserved";
}

interface Snapshot {
  flightNumber: string;
  airline: string;
  route: { from: string; to: string };
  departureAt: string;
  arrivalAt: string;
  basePrice: number;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen"><NavBar /><main className="app-shell mt-6">Loading checkout...</main></div>}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const router = useRouter();
  const query = useSearchParams();
  const flightId = query.get("flightId") || "";
  const travelClass = (query.get("class") || "economy") as SeatClass;
  const passengersCount = Number(query.get("passengers") || "1");
  const tier = query.get("tier") || "standard";
  const snapshotEncoded = query.get("snapshot") || "";

  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SeatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
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
    router.push(`/auth?next=${encodeURIComponent(returnTo)}`);
  }, [router]);

  const snapshot = useMemo(() => {
    if (!snapshotEncoded) return undefined;
    try {
      return JSON.parse(decodeURIComponent(snapshotEncoded)) as Snapshot;
    } catch {
      return undefined;
    }
  }, [snapshotEncoded]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => {
        if (!response.ok) {
          void redirectToAuth();
        }
      })
      .catch(() => {
        void redirectToAuth();
      });
  }, [redirectToAuth]);

  useEffect(() => {
    if (!flightId) return;
    if (flightId.startsWith("AMADEUS_")) {
      const virtualSeats = Array.from({ length: 36 }, (_, idx) => {
        const row = Math.floor(idx / 6) + 1;
        const col = ["A", "B", "C", "D", "E", "F"][idx % 6];
        return {
          id: `${row}${col}`,
          class: idx < 6 ? "royal" : idx < 18 ? "business" : "economy",
          status: "available",
        } as SeatItem;
      });
      queueMicrotask(() => setSeats(virtualSeats));
      return;
    }

    fetch(`/api/flights/${flightId}/seats`)
      .then((response) => response.json())
      .then((data: SeatItem[]) => setSeats(data))
      .catch(() => setSeats([]));
  }, [flightId]);

  const allowedSeats = seats.filter((seat) => seat.status === "available" && seat.class === travelClass);

  function toggleSeat(seat: SeatItem) {
    setSelectedSeats((current) => {
      const exists = current.some((item) => item.id === seat.id);
      if (exists) return current.filter((item) => item.id !== seat.id);
      if (current.length >= passengersCount) return current;
      return [...current, seat];
    });
  }

  async function continueToPayment() {
    setError("");
    const passportCountryCode = passportCountry.trim().toUpperCase().slice(0, 2);
    const nationalityCode = nationality.trim().toUpperCase().slice(0, 2);

    if (step === 1) {
      if (!flightId || !fullName || !email || !passportNumber || !passportCountryCode || !passportExpiry || !nationalityCode || !dateOfBirth) {
        setError("Please complete all required passenger fields.");
        return;
      }
      if (passportCountryCode.length !== 2 || nationalityCode.length !== 2) {
        setError("Passport country and nationality must be 2-letter country codes (e.g., IN, US).");
        return;
      }
      setStep(2);
      return;
    }
    if (selectedSeats.length === 0) {
      setError("Please select seat(s) to continue.");
      return;
    }

    setBusy(true);
    const payload = {
      flightId,
      travelClass,
      seats: selectedSeats.map((seat): Seat => ({ id: seat.id, class: travelClass, status: "available" })),
      flightSnapshot: snapshot,
      passenger: {
        fullName,
        email,
        phoneNumber: phoneNumber || undefined,
        passportNumber: passportNumber.toUpperCase(),
        passportCountry: passportCountryCode,
        passportExpiry,
        nationality: nationalityCode,
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
      setError("Your session expired. Please login again.");
      void redirectToAuth();
      return;
    }
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error || "Failed to start payment.");
      return;
    }

    const paymentParams = new URLSearchParams({
      mode: data.mode,
      amount: String(data.amount || ""),
      pendingCheckoutId: String(data.pendingCheckoutId || ""),
      checkoutUrl: String(data.checkoutUrl || ""),
      sessionId: String(data.sessionId || ""),
      tier,
    });
    router.push(`/payment?${paymentParams.toString()}`);
  }

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6 space-y-6">
        <section className={tier === "luxury" ? "card-luxury p-6" : "card p-6"}>
          <h1 className="section-title">Checkout</h1>
          <p className={tier === "luxury" ? "mt-2 text-[#d6c49f]" : "subtle mt-2"}>
            Step 1: Passenger Info, Step 2: Seat Selection, Step 3: Payment, Step 4: Digital Ticket
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={step === 1 ? "chip" : "chip !bg-white"}>1. Passenger</span>
            <span className={step === 2 ? "chip" : "chip !bg-white"}>2. Seats</span>
            <span className="chip !bg-white">3. Payment</span>
            <span className="chip !bg-white">4. Ticket</span>
          </div>
        </section>

        {step === 1 && (
          <section className={tier === "luxury" ? "card-luxury p-6" : "card p-6"}>
            <h2 className="text-xl font-extrabold text-[#12325d]">Passenger Details</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="field" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="field" placeholder="Phone Number (optional)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              <input className="field" placeholder="Passport Number" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} />
              <input className="field" placeholder="Passport Country (2 letters)" value={passportCountry} onChange={(e) => setPassportCountry(e.target.value.toUpperCase().slice(0, 2))} />
              <input className="field" placeholder="Nationality (2 letters)" value={nationality} onChange={(e) => setNationality(e.target.value.toUpperCase().slice(0, 2))} />
              <label>
                <span className="mb-1 block text-sm font-bold text-[#1a355d]">Date of Birth</span>
                <input className="field" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-sm font-bold text-[#1a355d]">Passport Expiry</span>
                <input className="field" type="date" value={passportExpiry} onChange={(e) => setPassportExpiry(e.target.value)} />
              </label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className={tier === "luxury" ? "card-luxury p-6" : "card p-6"}>
            <h2 className="text-xl font-extrabold text-[#12325d]">Seat Selection</h2>
            <p className={tier === "luxury" ? "mt-2 text-[#d6c49f]" : "subtle mt-2"}>
              Choose up to {passengersCount} seat(s) in {travelClass} class.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {allowedSeats.map((seat) => {
                const active = selectedSeats.some((item) => item.id === seat.id);
                return (
                  <button
                    key={seat.id}
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-sm font-bold ${active ? "border-[#0f5cc0] bg-[#d9e9ff] text-[#0f5cc0]" : "border-[#d6e2f2] bg-white text-[#193c69]"}`}
                    onClick={() => toggleSeat(seat)}
                  >
                    {seat.id}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className={tier === "luxury" ? "card-luxury p-6" : "card p-6"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="subtle">Selected seats: {selectedSeats.map((s) => s.id).join(", ") || "None"}</p>
            <div className="flex flex-wrap gap-2">
              {step === 2 && (
                <button className="btn-secondary min-w-40" onClick={() => setStep(1)}>
                  Back
                </button>
              )}
              <button className={tier === "luxury" ? "btn-luxury min-w-64" : "btn-primary min-w-64"} disabled={busy} onClick={continueToPayment}>
                {busy ? "Please wait..." : step === 1 ? "Continue to Seats" : "Continue to Payment"}
              </button>
            </div>
          </div>
          {error && <p className="status-err mt-3 text-sm">{error}</p>}
        </section>
      </main>
    </div>
  );
}
