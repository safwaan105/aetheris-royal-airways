"use client";

export function DownloadTicketButton({ pnr, bookingId }: { pnr: string; bookingId: string }) {
  function downloadTicket() {
    if (!bookingId) return;
    window.location.href = `/api/tickets/${encodeURIComponent(bookingId)}/pdf`;
  }

  function printTicket() {
    if (!bookingId) return;
    window.open(`/api/tickets/${encodeURIComponent(bookingId)}/pdf`, "_blank");
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={downloadTicket} className="btn-secondary min-w-52" disabled={!bookingId}>
        Download E-Ticket PDF
      </button>
      <button onClick={printTicket} className="btn-secondary min-w-52" disabled={!bookingId}>
        Print Ticket
      </button>
      {!bookingId && <p className="text-xs text-[#95a9cc]">Ticket not ready for booking {pnr || "N/A"}.</p>}
    </div>
  );
}
