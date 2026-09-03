"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidEmail, isValidPassword } from "@/lib/validation";
import { Modal } from "@/components/ui/Modal";
import { LogoMark } from "@/components/ui/Logo";

type Mode = "login" | "signup";

export function AuthModal({
  initialMode = "login",
  onClose,
  onForgotPassword,
  onSuccess,
}: {
  initialMode?: Mode;
  onClose: () => void;
  onForgotPassword: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const isSignup = mode === "signup";

  async function handleGoogle() {
    const supabase = createClient();
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isSignup && fullName.trim().length === 0) {
      setError("Full name is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (isSignup) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        onSuccess();
      } else {
        setCheckEmail(true);
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Incorrect email or password.");
      return;
    }
    onSuccess();
  }

  if (checkEmail) {
    return (
      <Modal onClose={onClose}>
        <LogoMark size={44} />
        <h2 className="font-display mt-5 text-2xl font-semibold text-white">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-white/60">
          We sent a confirmation link to {email}. Click it to activate your
          account, then log in.
        </p>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <LogoMark size={44} />
      <h2 className="font-display mt-5 text-2xl font-semibold text-white">
        {isSignup ? "Log in or sign up" : "Log in or sign up"}
      </h2>
      <p className="mt-2 text-sm text-white/60">
        Save your conversations and unlock projects, drafts and document
        uploads.
      </p>

      <button
        type="button"
        onClick={handleGoogle}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-medium text-navy-deeper transition hover:bg-white/90"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/10" />
        OR
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {isSignup && (
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="auth-card-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal"
          />
        )}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-card-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal"
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
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

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-teal py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {loading
            ? "Please wait…"
            : isSignup
              ? "Create Account"
              : "Log in to Workspace"}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-white/60 hover:text-white"
        >
          Forgot password?
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(isSignup ? "login" : "signup");
          }}
          className="font-medium text-teal"
        >
          {isSignup ? "Already have an account? Log in" : "New here? Sign up"}
        </button>
      </div>
    </Modal>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
