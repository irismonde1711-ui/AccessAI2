"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidPassword } from "@/lib/validation";
import { LogoMark } from "@/components/ui/Logo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        setEmail(session.user.email ?? null);
        setReady(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidPassword(password)) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <div className="sidebar-gradient relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-navy-deeper/80 p-8 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="font-display text-sm font-semibold text-white/80">
            AccessAI2
          </span>
        </div>

        {!ready ? (
          <p className="mt-8 text-sm text-white/60">Verifying your reset link…</p>
        ) : !email ? (
          <>
            <h1 className="font-display mt-6 text-2xl font-semibold text-white">
              Reset link invalid or expired
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Request a new password reset link from the login screen.
            </p>
          </>
        ) : success ? (
          <>
            <h1 className="font-display mt-6 text-2xl font-semibold text-white">
              Password updated
            </h1>
            <p className="mt-2 text-sm text-white/60">Redirecting you now…</p>
          </>
        ) : (
          <>
            <h1 className="font-display mt-6 text-2xl font-semibold text-white">
              Set a new password
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Choose a password of at least 6 characters for {email}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-card-input w-full rounded-xl px-4 py-3 pr-16 text-sm text-white outline-none focus:border-teal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-teal"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">
                  Confirm password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-card-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-teal py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-white/50">
              Remembered it?{" "}
              <Link href="/" className="font-medium text-teal">
                Back to log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
