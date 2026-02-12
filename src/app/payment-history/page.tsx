"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";

interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  status: string;
  reference?: string | null;
  createdAt: string;
  booking?: {
    id: string;
    pnr: string;
    travelClass: string;
    totalPrice: number;
  } | null;
}

export default function PaymentHistoryPage() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/payments")
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error || "Failed to load payment history.");
          return;
        }
        setItems(data as PaymentItem[]);
      })
      .catch(() => setError("Failed to load payment history."));
  }, []);

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <section className="card p-6 md:p-8">
          <h1 className="section-title">Payment History</h1>
          <p className="subtle mt-2">Your successful and failed payment attempts.</p>
          {error && <p className="status-err mt-3 text-sm">{error}</p>}

          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>Booking</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="subtle">No payment history yet.</td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                    <td>${item.amount} {item.currency.toUpperCase()}</td>
                    <td>{item.method}</td>
                    <td>{item.status}</td>
                    <td>{item.reference || "-"}</td>
                    <td>{item.booking?.pnr || "-"}</td>
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
