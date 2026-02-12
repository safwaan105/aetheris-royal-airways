import Link from "next/link";
import { NavBar } from "@/components/NavBar";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6 max-w-2xl">
        <section className="card p-6 md:p-8">
          <h1 className="section-title">Payment Cancelled</h1>
          <p className="subtle mt-3">No charge was completed. You can return to booking and try again.</p>
          <Link href="/" className="btn-primary mt-5 inline-flex min-w-56">
            Back to Booking
          </Link>
        </section>
      </main>
    </div>
  );
}
