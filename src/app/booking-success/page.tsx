import Link from "next/link";
import Image from "next/image";
import { NavBar } from "@/components/NavBar";
import { DownloadTicketButton } from "@/components/DownloadTicketButton";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; pnr?: string; total?: string }>;
}) {
  const resolved = await searchParams;

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <section className="card p-6 md:p-8">
          <h1 className="section-title">Booking Confirmed</h1>
          <p className="subtle mt-2">Your ticket has been successfully booked.</p>
          <div className="mt-5 rounded-xl border border-[#d6e2f2] bg-[#f8fbff] p-4">
            <p className="text-base font-bold text-[#12335d]">PNR: {resolved.pnr || "N/A"}</p>
            <p className="text-base font-bold text-[#12335d]">Total Paid: ${resolved.total || "0"}</p>
            <div className="mt-3 inline-flex items-center gap-3 rounded-lg border border-[#ccd5e6] bg-white p-2">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`PNR:${resolved.pnr || "N/A"}|TOTAL:${resolved.total || "0"}`)}`}
                alt="Ticket QR code"
                width={110}
                height={110}
              />
              <p className="text-xs text-[#4b5f7f]">Scan this QR at check-in.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/my-bookings" className="btn-primary min-w-52">
              View My Trips
            </Link>
            <DownloadTicketButton pnr={resolved.pnr || ""} bookingId={resolved.bookingId || ""} />
            <Link href="/" className="btn-secondary min-w-52">
              Book Another Flight
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
