"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";

interface AdminBooking {
  id: string;
  pnr: string;
  createdAt: string;
  totalPrice: number;
  travelClass: string;
  paymentStatus: string;
  user: { id: string; name: string; email: string };
  flight: { flightNumber: string; from: string; to: string } | null;
}

export default function AdminBookingsPage() {
  const [items, setItems] = useState<AdminBooking[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/bookings")
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error || "Failed to load bookings.");
          return;
        }
        setItems(data as AdminBooking[]);
      })
      .catch(() => setError("Failed to load bookings."));
  }, []);

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="section-title">Admin Bookings</h1>
            <Link href="/admin" className="btn-secondary !min-h-9 px-3">Back to Flights</Link>
          </div>
          {error && <p className="status-err mt-3 text-sm">{error}</p>}

          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>PNR</th>
                  <th>User</th>
                  <th>Flight</th>
                  <th>Class</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.pnr}</td>
                    <td>{item.user.name} ({item.user.email})</td>
                    <td>{item.flight ? `${item.flight.flightNumber} ${item.flight.from}-${item.flight.to}` : "-"}</td>
                    <td>{item.travelClass}</td>
                    <td>${item.totalPrice}</td>
                    <td>{item.paymentStatus}</td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
