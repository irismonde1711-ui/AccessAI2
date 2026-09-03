"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthModal } from "@/components/auth/AuthModal";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import { UsageLimitModal } from "@/components/chat/UsageLimitModal";
import { ChatView } from "@/components/chat/ChatView";
import { LogoMark } from "@/components/ui/Logo";

type ModalState = "login" | "signup" | "forgot" | null;

export function HomeShell({
  fullName,
  email,
}: {
  fullName: string | null;
  email: string | null;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [limitUnlockAt, setLimitUnlockAt] = useState<string | null>(null);
  const router = useRouter();
  const isLoggedIn = Boolean(email);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  function handleAuthSuccess() {
    setModal(null);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-panel-grey">
      <header className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="font-display text-lg font-semibold text-navy-deeper">
            AccessAI2
          </span>
        </div>

        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-grey">{fullName ?? email}</span>
            <button
              onClick={handleLogout}
              className="rounded-full border border-navy-deeper/20 px-4 py-2 text-sm font-medium text-navy-deeper hover:bg-navy-deeper/5"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModal("login")}
              className="rounded-full px-4 py-2 text-sm font-medium text-navy-deeper hover:bg-navy-deeper/5"
            >
              Log in
            </button>
            <button
              onClick={() => setModal("signup")}
              className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Sign up for free
            </button>
          </div>
        )}
      </header>

      {!isLoggedIn && (
        <div className="border-b border-teal/20 bg-teal-light px-6 py-2 text-center text-sm text-navy-deeper">
          Get responses tailored to you —{" "}
          <button
            onClick={() => setModal("signup")}
            className="font-semibold text-teal underline"
          >
            sign up for free
          </button>{" "}
          to save conversations and unlock projects.
        </div>
      )}

      <ChatView fullName={fullName} onLimitReached={setLimitUnlockAt} />

      {(modal === "login" || modal === "signup") && (
        <AuthModal
          initialMode={modal}
          onClose={() => setModal(null)}
          onForgotPassword={() => setModal("forgot")}
          onSuccess={handleAuthSuccess}
        />
      )}
      {modal === "forgot" && (
        <ForgotPasswordModal onClose={() => setModal(null)} />
      )}
      {limitUnlockAt && (
        <UsageLimitModal
          unlockAt={limitUnlockAt}
          onClose={() => setLimitUnlockAt(null)}
          onUpgrade={() => {
            setLimitUnlockAt(null);
            if (!isLoggedIn) setModal("signup");
          }}
        />
      )}
    </div>
  );
}
