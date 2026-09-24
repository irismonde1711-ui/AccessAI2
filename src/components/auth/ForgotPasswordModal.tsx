"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidEmail } from "@/lib/validation";
import { GatewayModal as Modal } from "@/components/ui/GatewayModal";
import { RecoveryCodeForm } from "@/components/auth/RecoveryCodeForm";

export function ForgotPasswordModal({
  onClose,
  onVerified,
}: {
  onClose: () => void;
  onVerified?: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  // Set once a code is on its way: the modal then asks for the code rather
  // than the address.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleSubmit(e: React.SyntheticEvent) {
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
    setSentTo(email.trim().toLowerCase());
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
        {sentTo
          ? `Enter the code we sent to ${sentTo}. It expires in 60 minutes.`
          : "We'll email you a one-time code. It expires in 60 minutes."}
      </p>

      {sentTo ? (
        <div className="mt-6 space-y-3">
          <RecoveryCodeForm
            email={sentTo}
            onVerified={onVerified ?? (() => router.push("/reset-password"))}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || cooldown > 0}
            className="w-full py-1.5 text-[13px] text-white/50 transition hover:text-white disabled:cursor-not-allowed disabled:hover:text-white/50"
          >
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : loading
                ? "Sending…"
                : "Send another code"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            placeholder="you@company.com.au"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-card-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal"
          />

          {message && (
            <p className="auth-card-input rounded-xl px-4 py-3 text-sm text-white/80">{message}</p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="w-full rounded-full bg-teal py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : loading ? "Sending…" : "Send Reset Code"}
          </button>
        </form>
      )}
    </Modal>
  );
}
