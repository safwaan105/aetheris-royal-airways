"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";

interface SupportItem {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<SupportItem[]>([]);
  const [statusText, setStatusText] = useState("");
  const [isError, setIsError] = useState(false);

  async function loadTickets() {
    const response = await fetch("/api/support");
    const data = await response.json();
    if (!response.ok) {
      setStatusText(data.error || "Failed to load support requests.");
      setIsError(true);
      return;
    }
    setItems((data as SupportItem[]).map((item) => ({
      id: item.id,
      subject: item.subject,
      message: item.message,
      status: item.status,
      createdAt: item.createdAt,
    })));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTickets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submitTicket() {
    setStatusText("");
    setIsError(false);
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatusText(data.error || "Failed to submit support request.");
      setIsError(true);
      return;
    }
    setSubject("");
    setMessage("");
    setStatusText("Support request submitted.");
    await loadTickets();
  }

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6 space-y-5">
        <section className="card p-6 md:p-8">
          <h1 className="section-title">Support</h1>
          <p className="subtle mt-2">Submit a ticket and track your support requests.</p>

          <div className="mt-4 grid gap-3">
            <input className="field" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <textarea className="field min-h-32 resize-y" placeholder="Describe your issue" value={message} onChange={(e) => setMessage(e.target.value)} />
            <button className="btn-primary max-w-52" onClick={submitTicket}>
              Submit Ticket
            </button>
            {statusText && <p className={`text-sm ${isError ? "status-err" : "status-ok"}`}>{statusText}</p>}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-extrabold text-[#dbe8ff]">My Tickets</h2>
          <div className="mt-4 grid gap-3">
            {items.length === 0 && <p className="subtle text-sm">No support tickets yet.</p>}
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#2f3954] bg-[#10182b] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-[#deebff]">{item.subject}</p>
                  <span className="chip">{item.status}</span>
                </div>
                <p className="mt-2 text-sm text-[#9fb4d6]">{item.message}</p>
                <p className="mt-2 text-xs text-[#7f93b6]">{new Date(item.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
