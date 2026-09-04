"use client";

import { useEffect, useState } from "react";
import { isValidEmail } from "@/lib/validation";
import { GatewayModal as Modal } from "@/components/ui/GatewayModal";

export function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.message ?? null);
    if (typeof data.cooldownRemaining === "number") {
      setCooldown(data.cooldownRemaining);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-2xl font-semibold text-white">
        Reset your password
      </h2>
      <p className="mt-2 text-sm text-white/60">
        We&apos;ll email you a secure link. It expires in 60 minutes.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          placeholder="you@company.com.au"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={cooldown > 0}
          className="auth-card-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal disabled:opacity-60"
        />

        {message && (
          <p className="auth-card-input rounded-xl px-4 py-3 text-sm text-white/80">
            {message}
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || cooldown > 0}
          className="w-full rounded-full bg-teal py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : loading
              ? "Sending…"
              : "Send Reset Link"}
        </button>
      </form>
    </Modal>
  );
}
