"use client";

import type { Seat } from "@/types";

interface SeatSelectorProps {
  seats: Seat[];
  selected: Seat[];
  onToggle: (seat: Seat) => void;
}

export function SeatSelector({ seats, selected, onToggle }: SeatSelectorProps) {
  return (
    <div className="rounded-2xl border border-[#FFD700]/25 bg-[rgba(5,13,32,0.85)] p-4">
      <h4 className="mb-3 text-sm tracking-[0.2em] text-[#FFD700]">Seat Deck</h4>
      <div className="[perspective:900px]">
        <div className="grid grid-cols-6 gap-2">
        {seats.map((seat) => {
          const active = selected.some((picked) => picked.id === seat.id);
          const isReserved = seat.status === "reserved";
          const color =
            seat.class === "royal" ? "border-[#FFD700]" : seat.class === "business" ? "border-[#ff7cff]" : "border-white/30";
          return (
            <button
              key={seat.id}
              type="button"
              disabled={isReserved}
              className={`rounded-lg border px-2 py-2 text-xs transition-transform ${
                isReserved ? "cursor-not-allowed opacity-35" : "hover:scale-105"
              } ${color} ${
                active ? "bg-[rgba(255,215,0,0.25)] text-[#fff4cc] shadow-[0_0_16px_rgba(255,215,0,0.3)]" : "bg-[#0c1530]"
              }`}
              style={{ transform: "rotateX(18deg)" }}
              onClick={() => onToggle(seat)}
            >
              {seat.id}
            </button>
          );
        })}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded border border-[#FFD700]/70 px-2 py-1">Royal</span>
        <span className="rounded border border-[#ff7cff]/70 px-2 py-1">First</span>
        <span className="rounded border border-white/30 px-2 py-1">Economy</span>
        <span className="rounded border border-[#ff7ca9]/70 px-2 py-1">Dimmed = Reserved</span>
      </div>
    </div>
  );
}
