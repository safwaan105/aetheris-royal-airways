"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CheckoutSuccessClient({ sessionId }: { sessionId?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState(
    sessionId ? "Finalizing your booking..." : "Missing Stripe session id.",
  );
  const [details, setDetails] = useState<{ bookingId?: string; pnr?: string; totalPrice?: number }>({});

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Confirmation failed.");
        }
        setDetails({ bookingId: data.bookingId, pnr: data.pnr, totalPrice: data.totalPrice });
        setMessage("Payment received. Booking confirmed.");
        window.setTimeout(() => {
          router.push(`/booking-success?bookingId=${encodeURIComponent(data.bookingId || "")}&pnr=${encodeURIComponent(data.pnr || "")}&total=${encodeURIComponent(String(data.totalPrice || ""))}`);
        }, 700);
      })
      .catch((error: Error) => setMessage(error.message));
  }, [sessionId, router]);

  return (
    <>
      <p className="mt-3 text-[#d7e0ff]">{message}</p>
      {details.pnr && (
        <p className="mt-3 text-sm text-[#c5ff32]">
          PNR: {details.pnr} | Total: ${details.totalPrice}
        </p>
      )}
    </>
  );
}
