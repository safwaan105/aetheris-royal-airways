"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import type { FlightApiResponse } from "@/types";

interface FavoriteItem {
  id: string;
  flightId?: string | null;
  flightSnapshot: FlightApiResponse;
  createdAt: string;
}

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/favorites");
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Failed to load favorites.");
      return;
    }
    setItems(data as FavoriteItem[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function removeFavorite(id: string) {
    const response = await fetch(`/api/favorites/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setItems((curr) => curr.filter((item) => item.id !== id));
  }

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <section className="card p-6 md:p-8">
          <h1 className="section-title">Favourite Flights</h1>
          <p className="subtle mt-2">Your saved flights and quick booking shortcuts.</p>
          {error && <p className="status-err mt-3 text-sm">{error}</p>}
          <div className="mt-5 grid gap-3">
            {items.length === 0 && <p className="subtle text-sm">No favourite flights yet.</p>}
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#2f3954] bg-[#10182b] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#deebff]">
                    {item.flightSnapshot.flightNumber} | {item.flightSnapshot.route.from} to {item.flightSnapshot.route.to}
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/ticket/${encodeURIComponent(item.flightSnapshot._id)}?class=economy&passengers=1&tier=standard&snapshot=${encodeURIComponent(JSON.stringify(item.flightSnapshot))}`}
                      className="btn-secondary !min-h-9 px-3"
                    >
                      Book
                    </Link>
                    <button className="btn-secondary !min-h-9 px-3" onClick={() => removeFavorite(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-[#9fb4d6]">
                  {new Date(item.flightSnapshot.departureAt).toLocaleString()} to {new Date(item.flightSnapshot.arrivalAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
