"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";

type PaymentMethod = "upi" | "credit_card" | "debit_card" | "net_banking" | "wallet" | "crypto";

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen"><NavBar /><main className="app-shell mt-6">Loading payment...</main></div>}>
      <PaymentPageInner />
    </Suspense>
  );
}

function PaymentPageInner() {
  const router = useRouter();
  const query = useSearchParams();
  const mode = query.get("mode") || "simulated";
  const amount = Number(query.get("amount") || "0");
  const tier = query.get("tier") || "standard";
  const pendingCheckoutId = query.get("pendingCheckoutId") || "";
  const checkoutUrl = query.get("checkoutUrl") || "";
  const sessionId = query.get("sessionId") || "";
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [cryptoWallet, setCryptoWallet] = useState("");
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const upiId = (process.env.NEXT_PUBLIC_UPI_ID || "").trim();
  const upiName = (process.env.NEXT_PUBLIC_UPI_NAME || "Aetheris Royal Airways").trim();
  const fixedUpiQrImage = (process.env.NEXT_PUBLIC_UPI_QR_IMAGE_URL || "").trim();
  const upiQrData = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${encodeURIComponent(String(Math.max(1, amount || 0)))}&cu=INR&tn=${encodeURIComponent("Flight Booking")}`
    : "";
  const isWaitingForConfirmation = waitingForConfirmation || (mode === "upi_auto" && !!pendingCheckoutId);

  useEffect(() => {
    if (!isWaitingForConfirmation || !pendingCheckoutId) return;

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/payments/status?pendingCheckoutId=${encodeURIComponent(pendingCheckoutId)}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.status === "paid") {
        router.push(
          `/booking-success?bookingId=${encodeURIComponent(data.bookingId || "")}&pnr=${encodeURIComponent(data.pnr || "")}&total=${encodeURIComponent(String(data.totalPrice || amount))}`,
        );
      }
    }, 3500);

    return () => window.clearInterval(timer);
  }, [amount, isWaitingForConfirmation, pendingCheckoutId, router]);

  async function payNow() {
    setError("");
    if ((method === "credit_card" || method === "debit_card") && (!cardName || !cardNumber || !cardExpiry || !cardCvv)) {
      return setError("Please complete all card details.");
    }
    if (method === "crypto" && !cryptoWallet) return setError("Please enter crypto wallet address.");

    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    setProcessing(false);

    if (mode === "stripe") {
      if (!checkoutUrl) return setError("Missing Stripe checkout URL.");
      window.location.href = checkoutUrl;
      return;
    }
    if (!pendingCheckoutId) return setError("Missing pending checkout reference.");
    setWaitingForConfirmation(true);
    setError("");
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <section className={tier === "luxury" ? "card-luxury p-6 md:p-8" : "card p-6 md:p-8"}>
          <h1 className="section-title">Payment</h1>
          <p className={tier === "luxury" ? "mt-2 text-[#d6c49f]" : "subtle mt-2"}>Step 3 of 4: Select payment method and verify securely.</p>
          <p className={`mt-4 text-xl font-extrabold ${tier === "luxury" ? "text-[#f0c86f]" : "text-[#72c7ff]"}`}>Amount: ${amount || "0"}</p>
          <p className="mt-2 text-sm text-[#8abbe7]">Ticket is generated only after successful payment verification.</p>
          {mode === "upi_auto" && (
            <p className="mt-1 text-sm text-[#ffd39e]">Pay via UPI and this page auto-continues once gateway confirms payment.</p>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              { id: "upi", icon: "$", label: "UPI" },
              { id: "credit_card", icon: "C", label: "Credit Card" },
              { id: "debit_card", icon: "D", label: "Debit Card" },
              { id: "net_banking", icon: "N", label: "Net Banking" },
              { id: "wallet", icon: "W", label: "Wallets" },
              { id: "crypto", icon: "B", label: "Crypto" },
            ].map((item) => (
              <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#2d3853] bg-[#121a2d] p-3">
                <input type="radio" name="method" checked={method === item.id} onChange={() => setMethod(item.id as PaymentMethod)} />
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1f2a49] text-xs font-extrabold text-[#7ad7ff]">{item.icon}</span>
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          {method === "upi" && (
            <div className="mt-4 rounded-xl border border-[#2d3853] bg-[#101729] p-4">
              <p className="text-sm font-semibold text-[#95c4ff]">Scan UPI QR</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Image
                  src={fixedUpiQrImage || `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiQrData || `Aetheris-Pay-${amount || 0}`)}`}
                  alt="UPI QR Code"
                  width={140}
                  height={140}
                  className="rounded-lg border border-[#2d3853]"
                />
                <div className="min-w-[240px] flex-1">
                  {fixedUpiQrImage && (
                    <p className="mb-2 text-xs text-[#9dc8ff]">Using your fixed official bank QR.</p>
                  )}
                  {upiId ? (
                    <p className="mb-2 text-xs text-[#9dc8ff]">UPI Account: {upiId}</p>
                  ) : (
                    <p className="mb-2 text-xs text-[#ffb3b3]">Set NEXT_PUBLIC_UPI_ID in .env.local to use your real account QR.</p>
                  )}
                  <p className="text-xs text-[#9dc8ff]">After payment, tap Pay Securely and wait for auto confirmation.</p>
                </div>
              </div>
            </div>
          )}

          {(method === "credit_card" || method === "debit_card") && (
            <div className="mt-4 rounded-xl border border-[#2d3853] bg-[#101729] p-4">
              <p className="text-sm font-semibold text-[#95c4ff]">Secure Card Details</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input className="field md:col-span-2" placeholder="Name on card" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                <input className="field md:col-span-2" placeholder="Card number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                <input className="field" placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
                <input className="field" placeholder="CVV" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} />
              </div>
            </div>
          )}

          {method === "net_banking" && (
            <div className="mt-4 rounded-xl border border-[#2d3853] bg-[#101729] p-4">
              <p className="text-sm font-semibold text-[#95c4ff]">Select Bank</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak", "PNB"].map((bank) => (
                  <label key={bank} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#2d3853] p-2">
                    <input type="radio" name="bank" checked={selectedBank === bank} onChange={() => setSelectedBank(bank)} />
                    <span className="text-sm text-[#cde4ff]">{bank}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {method === "crypto" && (
            <div className="mt-4 rounded-xl border border-[#2d3853] bg-[#101729] p-4">
              <p className="text-sm font-semibold text-[#95c4ff]">Crypto Wallet</p>
              <input className="field mt-3" placeholder="0x..." value={cryptoWallet} onChange={(e) => setCryptoWallet(e.target.value)} />
            </div>
          )}

          {mode === "upi_auto" && isWaitingForConfirmation && (
            <div className="mt-4 rounded-xl border border-[#2d3853] bg-[#101729] p-4">
              <p className="text-sm text-[#9dc8ff]">Waiting for payment confirmation...</p>
            </div>
          )}

          {processing && (
            <div className="plane-processing mt-5 flex items-center justify-center">
              <p className="text-sm text-[#8abbe7]">Verifying payment... please wait</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button className={tier === "luxury" ? "btn-luxury min-w-56" : "btn-primary btn-shimmer min-w-56"} onClick={payNow} disabled={processing || isWaitingForConfirmation}>
              {processing ? "Processing..." : "Pay Securely"}
            </button>
          </div>
          {error && <p className="status-err mt-3 text-sm">{error}</p>}
          {mode === "stripe" && sessionId && <p className="subtle mt-2 text-sm">Session reference: {sessionId}</p>}
        </section>
      </main>
    </div>
  );
}
