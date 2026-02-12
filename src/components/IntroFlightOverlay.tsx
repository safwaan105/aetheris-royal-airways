"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoyalLogo } from "@/components/RoyalLogo";

export function IntroFlightOverlay() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("aetheris_intro_played") !== "1";
  });

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("aetheris_intro_played", "1");
    }, 2800);
    return () => clearTimeout(timeout);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04070f]/96"
        >
          <motion.div
            initial={{ x: -360, y: 40, scale: 0.75, rotate: -8 }}
            animate={{ x: 0, y: 0, scale: 1, rotate: 0 }}
            transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="absolute -inset-14 rounded-full bg-[radial-gradient(circle,_rgba(249,201,74,0.24),_transparent_62%)] blur-xl" />
            <RoyalLogo large />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.4] }}
            transition={{ duration: 1.8 }}
            className="pointer-events-none absolute h-[1px] w-[64vw] bg-gradient-to-r from-transparent via-[#c5ff32] to-transparent"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
