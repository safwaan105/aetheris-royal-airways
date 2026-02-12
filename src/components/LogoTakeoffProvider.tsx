"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { RoyalLogo } from "@/components/RoyalLogo";

interface LogoTakeoffContextValue {
  introActive: boolean;
}

const LogoTakeoffContext = createContext<LogoTakeoffContextValue>({ introActive: false });

export function useLogoTakeoff() {
  return useContext(LogoTakeoffContext);
}

export function LogoTakeoffProvider({ children }: { children: React.ReactNode }) {
  const [introActive, setIntroActive] = useState(false);

  useEffect(() => {
    const played = sessionStorage.getItem("aetheris_intro_played") === "1";
    if (played) return;

    const showTimeout = window.setTimeout(() => {
      setIntroActive(true);
    }, 0);
    const hideTimeout = window.setTimeout(() => {
      setIntroActive(false);
      sessionStorage.setItem("aetheris_intro_played", "1");
    }, 2000);

    return () => {
      window.clearTimeout(showTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, []);

  const value = useMemo(() => ({ introActive }), [introActive]);

  return (
    <LogoTakeoffContext.Provider value={value}>
      {children}
      {introActive && (
        <div className="intro-overlay" aria-live="polite" aria-label="Loading Aetheris Airways">
          <div className="intro-panel">
            <RoyalLogo large />
          </div>
        </div>
      )}
    </LogoTakeoffContext.Provider>
  );
}
