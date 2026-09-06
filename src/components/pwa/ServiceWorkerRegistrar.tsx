"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing only costs offline asset caching, so there is
      // nothing to surface to the user here.
    });
  }, []);

  return null;
}
