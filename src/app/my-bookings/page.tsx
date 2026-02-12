"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";

interface BookingItem {
  _id: string;
  pnr: string;
  travelClass: string;
  totalPrice: number;
  paymentStatus: string;
  kycStatus: string;
  createdAt: string;
  flightId?: {
    flightNumber: string;
    route: { from: string; to: string };
    departureAt: string;
  };
  flightSnapshot?: {
    flightNumber: string;
    route: { from: string; to: string };
    departureAt: string;
  };
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bookings")
      .then(async (response) => {
        if (!response.ok) {
          router.push("/auth");
          throw new Error("Unauthorized");
        }
        return response.json();
      })
      .then((data) => setBookings(data))
      .catch((err: Error) => setError(err.message));
  }, [router]);

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6 w-full max-w-5xl">
        <section className="card p-6 md:p-8">
          <h1 className="section-title">My Trips</h1>
          <p className="subtle mt-2">Review your booked flights and ticket references.</p>
          {error && <p className="status-err mt-4 text-sm">{error}</p>}
          <div className="mt-6 grid gap-3">
            {bookings.length === 0 ? (
              <p className="subtle text-sm">No bookings yet.</p>
            ) : (
              bookings.map((booking) => (
                <article key={booking._id} className="rounded-2xl border border-[#d6e2f2] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-[#12325d]">PNR: {booking.pnr}</h2>
                    <span className="rounded-full border border-[#c7dffb] bg-[#e9f2ff] px-2 py-1 text-xs text-[#0f5cc0]">
                      {booking.paymentStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#31517b]">
                    {(booking.flightId?.flightNumber || booking.flightSnapshot?.flightNumber) ?? "N/A"} |{" "}
                    {(booking.flightId?.route.from || booking.flightSnapshot?.route.from) ?? "N/A"} to{" "}
                    {(booking.flightId?.route.to || booking.flightSnapshot?.route.to) ?? "N/A"}
                  </p>
                  <p className="text-sm text-[#31517b]">
                    Departure:{" "}
                    {booking.flightId?.departureAt || booking.flightSnapshot?.departureAt
                      ? new Date(booking.flightId?.departureAt || booking.flightSnapshot?.departureAt || "").toLocaleString()
                      : "N/A"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#12325d]">
                    Class: {booking.travelClass} | Total: ${booking.totalPrice}
                  </p>
                  <p className="mt-1 text-xs text-[#5b6c84]">KYC: {booking.kycStatus}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`/api/tickets/${encodeURIComponent(booking._id)}/pdf`}
                      className="btn-secondary !min-h-9 px-3"
                    >
                      Download E-ticket PDF
                    </a>
                    <button
                      className="btn-secondary !min-h-9 px-3"
                      onClick={() => window.open(`/api/tickets/${encodeURIComponent(booking._id)}/pdf`, "_blank")}
                    >
                      Print Ticket
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
