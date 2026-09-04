"use client";

import { useEffect } from "react";

// Dedicated shell for the auth-flow modals (Login/Signup, Forgot Password).
// Confirmed against the prototype: unlike workspace modals, these stay a
// fixed dark navy gradient regardless of the light/dark theme toggle — a
// deliberate branded look for the gateway experience.
export function GatewayModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deeper/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-navy-deeper p-6 text-white shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
