"use client";

import { Modal } from "@/components/ui/Modal";
import { useTheme } from "@/components/theme/ThemeProvider";

const THEME_HELP: Record<string, string> = {
  light: "Always light, regardless of your device setting.",
  dark: "Always dark, regardless of your device setting.",
  system: "Matches your device's light or dark setting automatically.",
};

// Fixed swatch colours, independent of the active theme: the tile previews what
// you are choosing, so it must not restyle itself when the theme changes. The
// system swatch is a hard 50/50 split rather than a blend.
const THEME_OPTIONS = [
  { value: "light", label: "Light", swatch: "#F5F7FB" },
  { value: "dark", label: "Dark", swatch: "#0B1330" },
  { value: "system", label: "System", swatch: "linear-gradient(90deg,#F5F7FB 50%,#0B1330 50%)" },
] as const;

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
      <h2 className="mb-[22px] font-display text-[19px] font-semibold text-navy-deeper dark:text-white">
        Settings
      </h2>

      <p className="mb-[11px] text-[11.5px] uppercase tracking-[0.08em] text-muted-grey dark:text-white/40">
        Appearance
      </p>
      <div className="flex gap-2">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`flex flex-1 flex-col items-center gap-[9px] rounded-2xl px-2.5 py-3.5 transition ${
              theme === option.value
                ? "border-[1.5px] border-teal bg-teal/[0.08] text-navy-deeper dark:text-white"
                : "border border-black/10 bg-panel-grey text-navy-deeper hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
            }`}
          >
            <span
              className="h-[38px] w-full rounded-[10px] border border-black/10 dark:border-white/10"
              style={{ background: option.swatch }}
            />
            <span className="text-[13px] font-medium">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted-grey dark:text-white/50">
        {THEME_HELP[theme]}
      </p>

      <div className="mt-6 border-t border-black/10 pt-[18px] dark:border-white/10">
        <SettingRow
          label="Save chat history"
          description="Keep conversations in the sidebar. Turning this off applies to new chats only."
          checked={saveHistory}
          onChange={onToggleSaveHistory}
        />
        <SettingRow
          label="Start chats as temporary"
          description="New conversations open in temporary mode and are never saved."
          checked={startTemporary}
          onChange={onToggleStartTemporary}
        />
      </div>
    </Modal>
  );
}

function SettingRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-black/5 px-1 py-[13px] last:border-b-0 dark:border-white/5">
      <div className="min-w-0 flex-1">
        <p className="mb-[3px] text-[13.8px] text-navy-deeper dark:text-white">{label}</p>
        <p className="text-[12.3px] leading-[1.55] text-muted-grey dark:text-white/50">
          {description}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    // Track is padded and the knob sits in normal flow, so its travel is bounded
    // by the track itself rather than by a hand-tuned offset that can overshoot.
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={`flex h-[26px] w-11 shrink-0 items-center rounded-full p-[3px] transition-colors ${
        checked ? "bg-teal" : "bg-black/20 dark:bg-white/20"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
