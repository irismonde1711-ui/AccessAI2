"use client";

import { useEffect, useRef } from "react";

export function ProfileMenu({
  fullName,
  email,
  onClose,
  onOpenSettings,
  onOpenBilling,
  onLogout,
}: {
  fullName: string | null;
  email: string | null;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenBilling: () => void;
  onLogout: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [onClose]);

  const initial = (fullName ?? email ?? "?").charAt(0).toUpperCase();

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-2 right-2 z-20 mb-2 overflow-hidden rounded-2xl border border-white/10 bg-navy-dark text-white shadow-2xl"
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-semibold text-white">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{fullName ?? email}</p>
          {fullName && <p className="truncate text-xs text-white/50">{email}</p>}
        </div>
      </div>
      <div className="border-t border-white/10 py-1">
        <button
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
          className="block w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/5"
        >
          Settings
        </button>
        <button
          onClick={() => {
            onClose();
            onOpenBilling();
          }}
          className="block w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/5"
        >
          Plans and billing
        </button>
      </div>
      <div className="border-t border-white/10 py-1">
        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="block w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/5"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
