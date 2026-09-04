"use client";

import { useEffect, useState } from "react";

// Starts false on both server and client (matches SSR output), then
// corrects post-mount — matching the pattern used for other client-only
// capability checks (see useVoiceInput) to avoid hydration mismatches.
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    // Deliberate: corrects post-mount for hydration safety (see comment above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(mq.matches);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}
