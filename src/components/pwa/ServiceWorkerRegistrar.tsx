"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Never in development: dev builds reuse chunk URLs, so a cached asset gets
    // served in place of freshly compiled code and edits appear to do nothing.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      caches?.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing only costs offline asset caching, so there is
      // nothing to surface to the user here.
    });
  }, []);

  return null;
}
