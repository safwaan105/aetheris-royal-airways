"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RoyalLogo } from "@/components/RoyalLogo";

interface AuthState {
  authenticated: boolean;
  user?: { role: "customer" | "admin"; name: string };
}

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NavBar() {
  const [auth, setAuth] = useState<AuthState>({ authenticated: false });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : { authenticated: false }))
      .then((data) => setAuth(data))
      .catch(() => setAuth({ authenticated: false }));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#171a24] bg-[#090b11] text-white">
      <div className="app-shell flex items-center justify-between py-3">
        <Link href="/" className="inline-flex items-center">
          <RoyalLogo />
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-white">
          <Link href="/" className="nav-item hover:bg-[#1c212f]">
            <Icon path="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />
            <span>Home</span>
          </Link>
          <Link href="/flights" className="nav-item hover:bg-[#1c212f]">
            <Icon path="M2.5 19.5h19M6 14.5l8.5-8.5 3.5 3.5-8.5 8.5L5 19z" />
            <span>Flights</span>
          </Link>
          <Link href="/support" className="nav-item hover:bg-[#1c212f]">
            <Icon path="M4 7h16M4 12h16M4 17h10" />
            <span>Support</span>
          </Link>
          <Link href="/favorites" className="nav-item hover:bg-[#1c212f]">
            <Icon path="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
            <span>Favorites</span>
          </Link>
          <Link href="/search-history" className="nav-item hover:bg-[#1c212f]">
            <Icon path="M12 8v5l3 2M21 12a9 9 0 1 1-9-9" />
            <span>Search History</span>
          </Link>
          {auth.authenticated && (
            <Link href="/my-bookings" className="nav-item hover:bg-[#1c212f]">
              <Icon path="M4 6h16v14H4zM8 4v4M16 4v4M7 12h10M7 16h6" />
              <span>My Bookings</span>
            </Link>
          )}
          {auth.authenticated && (
            <Link href="/payment-history" className="nav-item hover:bg-[#1c212f]">
              <Icon path="M4 7h16v10H4zM8 17h8M8 11h3" />
              <span>Payments</span>
            </Link>
          )}
          {auth.user?.role === "admin" && (
            <Link href="/admin" className="nav-item hover:bg-[#1c212f]">
              <Icon path="M4 19h16M6 19V8m6 11V5m6 14v-8" />
              <span>Admin</span>
            </Link>
          )}
          {!auth.authenticated ? (
            <Link href="/auth" className="nav-item bg-[#3a46ff] text-white hover:bg-[#313de8]">
              <Icon path="M8 8V6a4 4 0 0 1 8 0v2M6 8h12v12H6zM12 13v3" />
              <span>Login</span>
            </Link>
          ) : (
            <button
              onClick={logout}
              className="nav-item hover:bg-[#1c212f]"
            >
              <Icon path="M15 16l4-4-4-4M19 12H9M12 20H6V4h6" />
              <span>Logout</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
