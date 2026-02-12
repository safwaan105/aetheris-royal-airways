"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";

interface AdminPayment {
  id: string;
  pendingCheckoutId?: string | null;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  status: string;
  reference?: string | null;
  createdAt: string;
  booking?: { pnr: string } | null;
  user: { name: string; email: string };
}

export default function AdminPaymentsPage() {
  const [items, setItems] = useState<AdminPayment[]>([]);
  const [error, setError] = useState("");
  const [verifyingId, setVerifyingId] = useState("");

  useEffect(() => {
    fetch("/api/admin/payments")
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error || "Failed to load payments.");
          return;
        }
        setItems(data as AdminPayment[]);
      })
      .catch(() => setError("Failed to load payments."));
  }, []);

  async function verifyPayment(paymentId: string) {
    setError("");
    setVerifyingId(paymentId);
    const response = await fetch(`/api/admin/payments/${paymentId}/verify`, {
      method: "POST",
    });
    const data = await response.json();
    setVerifyingId("");

    if (!response.ok) {
      setError(data.error || "Failed to verify payment.");
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === paymentId
          ? { ...item, status: "paid", booking: data.pnr ? { pnr: data.pnr } : item.booking }
          : item,
      ),
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="section-title">Admin Payments</h1>
            <Link href="/admin" className="btn-secondary !min-h-9 px-3">Back to Flights</Link>
          </div>
          {error && <p className="status-err mt-3 text-sm">{error}</p>}

          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>PNR</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                    <td>{item.user.name} ({item.user.email})</td>
                    <td>${item.amount} {item.currency.toUpperCase()}</td>
                    <td>{item.method} / {item.provider}</td>
                    <td>{item.status}</td>
                    <td>{item.reference || "-"}</td>
                    <td>{item.booking?.pnr || "-"}</td>
                    <td>
                      {item.status !== "paid" && item.provider === "manual_upi" ? (
                        <button
                          className="btn-secondary !min-h-8 px-3 text-xs"
                          onClick={() => verifyPayment(item.id)}
                          disabled={verifyingId === item.id}
                        >
                          {verifyingId === item.id ? "Verifying..." : "Verify & Issue"}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
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
