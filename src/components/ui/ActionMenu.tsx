"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ActionMenuProps = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** What the trigger button reads, e.g. "Download" or "Translating…". */
  label: ReactNode;
  /** Describes the invisible backdrop for screen readers, e.g. "Close download menu". */
  closeLabel: string;
  children: ReactNode;
};

// w-44, matched here because the menu has to be kept inside the window by hand.
const MENU_WIDTH = 176;
const GAP = 6;

/**
 * A small dropdown for the row of actions under an answer.
 *
 * It is drawn at the top of the page rather than inside the message, because
 * the last answer's action row sits hard against the composer: a menu nested
 * in the message opened underneath it, with no way to scroll down to the part
 * that was cut off. Living outside the scrolling transcript, it can also flip
 * above the button when the window has no room below.
 */
export function ActionMenu({ open, onToggle, onClose, label, closeLabel, children }: ActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    // A closed menu is not rendered, so the last placement can be left where
    // it is; this effect runs before paint and corrects it on the way back up.
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();

      // The button has been scrolled out of sight, so a menu pinned to it
      // would float on its own somewhere over the page.
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        onClose();
        return;
      }

      const height = menuRef.current?.offsetHeight ?? 0;
      const roomBelow = window.innerHeight - rect.bottom - GAP;
      const flipAbove = height > roomBelow && rect.top - GAP > roomBelow;

      const top = flipAbove ? Math.max(GAP, rect.top - height - GAP) : rect.bottom + GAP;
      const left = Math.min(Math.max(GAP, rect.left), window.innerWidth - MENU_WIDTH - GAP);

      // Returning the same object when nothing moved matters: the callers pass
      // fresh onClose functions on every render, so a new object here would
      // re-run this effect for ever.
      setPlacement((current) =>
        current && current.top === top && current.left === left ? current : { top, left },
      );
    }

    place();
    window.addEventListener("resize", place);
    // Capture, so the transcript's own scrolling moves the menu too.
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className="hover:text-navy-deeper dark:hover:text-white"
      >
        {label}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button type="button" aria-label={closeLabel} className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
            <div
              ref={menuRef}
              role="menu"
              // Off-screen until measured, so it is never seen in the wrong place.
              style={{ top: placement?.top ?? -9999, left: placement?.left ?? -9999 }}
              className="fixed z-[45] w-44 overflow-hidden rounded-xl border border-black/10 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-navy-deeper"
            >
              {children}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
