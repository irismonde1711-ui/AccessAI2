"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import { isValidPassword } from "@/lib/validation";
import { LogoMark } from "@/components/ui/Logo";
import { EyeIcon, EyeOffIcon } from "@/components/ui/Icons";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [requestingNew, setRequestingNew] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase hands the recovery session over in one of three shapes depending
  // on the project's email template and flow: tokens in the URL fragment, a
  // `code` to exchange, or a `token_hash` to verify. Handle all of them rather
  // than relying on the client picking it up on its own, and surface the real
  // reason when the link itself is dead.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function init() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const failure = hash.get("error_description") ?? query.get("error_description");
      if (failure) {
        if (!cancelled) {
          setLinkError(failure.replace(/\+/g, " "));
          setReady(true);
        }
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = query.get("code");
      const tokenHash = query.get("token_hash");

      try {
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } else if (tokenHash) {
          await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        // Fall through: getUser below decides whether we have a session.
      }

      // Keep the one-time tokens out of the address bar and out of history.
      if (accessToken || code || tokenHash) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setEmail(data.user?.email ?? null);
      setReady(true);
    }

    init();
    return () => {
      cancelled = true;
    };
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
              {linkError ? "Reset link invalid or expired" : "Reset your password"}
            </h1>
            <p className="mt-2 text-sm text-white/60">
              {linkError
                ? `${linkError}. Send yourself a one-time code instead — it can't be used up by your mail app.`
                : "Send yourself a one-time code and enter it here to set a new password."}
            </p>
            <button
              type="button"
              onClick={() => setRequestingNew(true)}
              className="mt-6 w-full rounded-full bg-teal py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Email me a code
            </button>
            <p className="mt-5 text-center text-sm text-white/50">
              <Link href="/" className="font-medium text-teal">
                Back to log in
              </Link>
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
                    className="auth-card-input w-full rounded-xl px-4 py-3 pr-12 text-sm text-white outline-none focus:border-teal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 transition hover:text-teal"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="auth-card-input w-full rounded-xl px-4 py-3 pr-12 text-sm text-white outline-none focus:border-teal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 transition hover:text-teal"
                  >
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
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

      {requestingNew && (
        <ForgotPasswordModal
          onClose={() => setRequestingNew(false)}
          // Already on this page, so a route push would not re-run the
          // session check: reload instead, now that the code has signed
          // the user in.
          onVerified={() => window.location.replace("/reset-password")}
        />
      )}
    </div>
  );
}
