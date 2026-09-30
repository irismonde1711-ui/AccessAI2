"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Second half of a password reset: the user types the code from the email.
//
// A code survives what a link does not — mail scanners and preview fetchers
// open links before the recipient does, and a one-time link opened by a
// scanner is already spent by the time it is clicked.
export function RecoveryCodeForm({
  email,
  onVerified,
}: {
  email: string;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Supabase grc grc projects can be set to a 6- or 8-digit code, so accept either
    // rather than hard-coding a length the dashboard controls.
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError("Enter the full code from the email.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    setLoading(false);

    if (verifyError) {
      // Supabase answers a wrong code and a stale one with the same message,
      // so the copy has to cover both.
      setError("That code is wrong or has expired. Check the email, or send yourself a new one.");
      return;
    }
    onVerified();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={10}
        placeholder="12345678"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
        className="auth-card-input w-full rounded-xl px-4 py-3 text-center text-lg font-semibold tracking-[0.3em] text-white outline-none focus:border-teal"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-teal py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
