"use client";

import { useEffect } from "react";

/** Registers the offline service worker in production builds. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.warn("Service worker not registered", e));
  }, []);
  return null;
}
