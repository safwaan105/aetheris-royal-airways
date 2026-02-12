"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  bookingsCount: number;
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error || "Failed to load users.");
          return;
        }
        setItems(data as AdminUser[]);
      })
      .catch(() => setError("Failed to load users."));
  }, []);

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="section-title">Admin Users</h1>
            <Link href="/admin" className="btn-secondary !min-h-9 px-3">Back to Flights</Link>
          </div>
          {error && <p className="status-err mt-3 text-sm">{error}</p>}

          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Bookings</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.role}</td>
                    <td>{item.bookingsCount}</td>
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
