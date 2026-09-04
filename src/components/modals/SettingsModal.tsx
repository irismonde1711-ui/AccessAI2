"use client";

import { Modal } from "@/components/ui/Modal";
import { useTheme } from "@/components/theme/ThemeProvider";

const THEME_HELP: Record<string, string> = {
  light: "Always light, regardless of your device setting.",
  dark: "Always dark, regardless of your device setting.",
  system: "Matches your device's light or dark setting automatically.",
};

export function SettingsModal({
  onClose,
  saveHistory,
  onToggleSaveHistory,
  startTemporary,
  onToggleStartTemporary,
}: {
  onClose: () => void;
  saveHistory: boolean;
  onToggleSaveHistory: () => void;
  startTemporary: boolean;
  onToggleStartTemporary: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-2xl font-semibold text-navy-deeper dark:text-white">
        Settings
      </h2>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-grey dark:text-white/40">
        Appearance
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["light", "dark", "system"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`rounded-xl border p-3 text-center text-sm capitalize transition ${
              theme === t
                ? "border-teal bg-teal/10 text-navy-deeper dark:bg-white/10 dark:text-white"
                : "border-black/10 text-muted-grey hover:bg-black/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
            }`}
          >
            <span
              className={`mb-2 block h-8 w-full rounded-md border border-black/10 dark:border-white/10 ${
                t === "light" ? "bg-white" : t === "dark" ? "bg-navy-deeper" : "bg-gradient-to-r from-white to-navy-deeper"
              }`}
            />
            {t}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-grey dark:text-white/40">{THEME_HELP[theme]}</p>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-navy-deeper dark:text-white">Save chat history</p>
          <p className="text-xs text-muted-grey dark:text-white/50">
            Keep conversations in the sidebar. Turning this off applies to new chats only.
          </p>
        </div>
        <Toggle checked={saveHistory} onChange={onToggleSaveHistory} />
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-navy-deeper dark:text-white">
            Start chats as temporary
          </p>
          <p className="text-xs text-muted-grey dark:text-white/50">
            New conversations open in temporary mode and are never saved.
          </p>
        </div>
        <Toggle checked={startTemporary} onChange={onToggleStartTemporary} />
      </div>
    </Modal>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-teal" : "bg-black/15 dark:bg-white/15"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
