"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";

interface SupportItem {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
}

export default function AdminSupportPage() {
  const [items, setItems] = useState<SupportItem[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/support");
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Failed to load support requests.");
      return;
    }
    setItems(data as SupportItem[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function updateStatus(id: string, status: "open" | "resolved") {
    const response = await fetch(`/api/support/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return;
    setItems((curr) =>
      curr.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="section-title">Admin Support</h1>
            <Link href="/admin" className="btn-secondary !min-h-9 px-3">Back to Flights</Link>
          </div>
          {error && <p className="status-err mt-3 text-sm">{error}</p>}

          <div className="mt-4 grid gap-3">
            {items.length === 0 && <p className="subtle text-sm">No support requests found.</p>}
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#2f3954] bg-[#10182b] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-[#deebff]">{item.subject}</p>
                  <span className={item.status === "resolved" ? "chip" : "chip-luxury"}>{item.status}</span>
                </div>
                <p className="mt-2 text-sm text-[#9fb4d6]">{item.message}</p>
                <p className="mt-2 text-xs text-[#7f93b6]">
                  {item.user.name} ({item.user.email}) | {new Date(item.createdAt).toLocaleString()}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-secondary !min-h-9 px-3" onClick={() => updateStatus(item.id, "open")}>
                    Mark Open
                  </button>
                  <button className="btn-secondary !min-h-9 px-3" onClick={() => updateStatus(item.id, "resolved")}>
                    Mark Resolved
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
