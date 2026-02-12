"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";

interface SearchHistoryItem {
  id: string;
  fromCode: string;
  toCode: string;
  departureDate: string;
  passengers: number;
  travelClass: string;
  tier: string;
  createdAt: string;
}

export default function SearchHistoryPage() {
  const [items, setItems] = useState<SearchHistoryItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/search-history")
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error || "Failed to load history.");
          return;
        }
        setItems(data as SearchHistoryItem[]);
      })
      .catch(() => setError("Failed to load history."));
  }, []);

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <section className="card p-6 md:p-8">
          <h1 className="section-title">Search History</h1>
          <p className="subtle mt-2">Recent route searches from your account.</p>
          {error && <p className="status-err mt-3 text-sm">{error}</p>}

          <div className="mt-5 grid gap-3">
            {items.length === 0 && <p className="subtle text-sm">No search history yet.</p>}
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#2f3954] bg-[#10182b] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-[#deebff]">
                    {item.fromCode} to {item.toCode}
                  </p>
                  <Link
                    href={`/results?from=${encodeURIComponent(item.fromCode)}&to=${encodeURIComponent(item.toCode)}&departure=${encodeURIComponent(item.departureDate)}&passengers=${encodeURIComponent(String(item.passengers))}&class=${encodeURIComponent(item.travelClass)}&tier=${encodeURIComponent(item.tier)}`}
                    className="btn-secondary !min-h-9 px-3"
                  >
                    Search Again
                  </Link>
                </div>
                <p className="mt-1 text-sm text-[#9fb4d6]">
                  Date: {item.departureDate} | Class: {item.travelClass} | Passengers: {item.passengers}
                </p>
                <p className="mt-1 text-xs text-[#7f93b6]">Saved: {new Date(item.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
