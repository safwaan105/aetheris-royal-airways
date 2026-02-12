"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";

type Mode = "login" | "signup" | "admin";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen"><NavBar /><main className="app-shell mt-6">Loading auth...</main></div>}>
      <AuthPageInner />
    </Suspense>
  );
}

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpChallengeId, setOtpChallengeId] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const oauthStatus = searchParams.get("oauth");
  const oauthMessageMap: Record<string, string> = {
    google_not_configured: "Google login is not configured yet. Please use email login/signup for now.",
    google_failed: "Google login failed. Please try again.",
    google_state_error: "Google login security check failed. Please retry.",
    google_access_denied: "Google login was cancelled. Please choose an account and continue.",
    google_redirect_uri_mismatch: "Google OAuth redirect URI mismatch. Add your callback URL in Google Cloud OAuth settings.",
    google_invalid_client: "Google OAuth client is invalid. Re-check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    apple_failed: "Apple login failed. Please try again.",
    apple_state_error: "Apple login security check failed. Please retry.",
  };
  const oauthMessage = oauthStatus ? oauthMessageMap[oauthStatus] || "OAuth login failed. Please try again." : "";

  async function submit() {
    setBusy(true);
    setMessage("");
    setIsError(false);

    const target =
      mode === "admin" ? "/api/auth/admin/login" : `/api/auth/${mode === "login" ? "login" : "signup"}`;

    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "signup"
          ? { name, email, password, rememberMe }
          : { email, password, rememberMe },
      ),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Authentication failed.");
      setIsError(true);
      setBusy(false);
      return;
    }

    if (mode === "login" && data.otpRequired) {
      setOtpChallengeId(data.challengeId);
      setMessage("OTP sent to your email. Enter code to finish login.");
      setIsError(false);
      setBusy(false);
      return;
    }

    setMessage("Authenticated successfully.");
    setIsError(false);
    setBusy(false);
    router.push(mode === "admin" ? "/admin" : "/");
    router.refresh();
  }

  async function verifyOtp() {
    if (!otpChallengeId || otp.trim().length !== 6) {
      setMessage("Enter 6-digit OTP.");
      setIsError(true);
      return;
    }
    setBusy(true);
    setMessage("");
    setIsError(false);

    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: otpChallengeId, code: otp.trim() }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "OTP verification failed.");
      setIsError(true);
      return;
    }

    setMessage("Authenticated successfully.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen overflow-hidden pb-12">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
      >
        <source src="https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#090d17]/70" />
      <div className="relative">
        <NavBar />
        <main className="app-shell mt-6 w-full max-w-xl">
          <section className="glass-panel p-6 md:p-8">
            <h1 className="section-title">Login / Register</h1>
            <p className="subtle mt-2">Secure access to bookings, checkout, and premium flight management.</p>
            <div className="mt-5 inline-flex rounded-xl border border-[#3a4666] p-1">
              <button
                onClick={() => setMode("login")}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === "login" ? "bg-[#2c3e66] text-[#cfe6ff]" : "text-[#9db4d8]"}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === "signup" ? "bg-[#2c3e66] text-[#cfe6ff]" : "text-[#9db4d8]"}`}
              >
                Signup
              </button>
              <button
                onClick={() => setMode("admin")}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === "admin" ? "bg-[#2c3e66] text-[#cfe6ff]" : "text-[#9db4d8]"}`}
              >
                Admin
              </button>
            </div>

            {mode === "login" && (
              <div className="mt-5 grid gap-3">
                <button
                  className="btn-secondary !justify-start gap-2"
                  onClick={() => (window.location.href = "/api/auth/oauth/google/start")}
                >
                  <span>G</span><span>Continue with Google</span>
                </button>
                <button
                  className="btn-secondary !justify-start gap-2"
                  onClick={() => (window.location.href = "/api/auth/oauth/apple/start")}
                >
                  <span>A</span><span>Continue with Apple</span>
                </button>
              </div>
            )}

            <div className="mt-5 grid gap-3">
              {mode === "signup" && (
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="field" />
              )}
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="field" />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="field" />

              <label className="mt-1 inline-flex items-center gap-2 text-sm text-[#a7bddf]">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Remember Me
              </label>

              <button onClick={submit} disabled={busy} className="btn-primary btn-shimmer mt-2">
                {busy ? "Please wait..." : mode === "signup" ? "Create account" : mode === "admin" ? "Admin Login" : "Login"}
              </button>
              {otpChallengeId && mode === "login" && (
                <>
                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="field"
                    maxLength={6}
                  />
                  <button onClick={verifyOtp} disabled={busy} className="btn-secondary mt-1">
                    Verify OTP
                  </button>
                </>
              )}
              {(message || oauthStatus) && (
                <p className={`text-sm ${message ? (isError ? "status-err" : "status-ok") : "status-err"}`}>
                  {message || oauthMessage}
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
