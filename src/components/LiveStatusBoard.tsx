"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface StatusItem {
  flightNumber: string;
  route: { from: string; to: string };
  departureAt: string;
  status: string;
}

export function LiveStatusBoard() {
  const [items, setItems] = useState<StatusItem[]>([]);

  useEffect(() => {
    fetch("/api/flights/status")
      .then((response) => response.json())
      .then((data: StatusItem[]) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  return (
    <section className="glass-panel rounded-[1.6rem] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="royal-text text-2xl text-[#FFD700]">Live Status</h3>
        <span className="badge-glow rounded-full bg-[rgba(255,0,255,0.16)] px-3 py-1 text-xs text-[#ff9cff]">Pseudo Live Feed</span>
      </div>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <motion.div
            key={item.flightNumber}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,36,0.8)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-[#f6ebc8]">{item.flightNumber}</p>
              <p className="text-xs text-[#d7e0ff]">{new Date(item.departureAt).toLocaleString()}</p>
            </div>
            <p className="mt-1 text-sm text-[#d5deff]">
              {item.route.from} to {item.route.to}
            </p>
            <p className="mt-2 text-sm text-[#ffd269]">{item.status}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
