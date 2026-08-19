"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing just means the app won't be installable/offline-fallback
      // capable this session — it must never block the app itself from working.
    });
  }, []);

  return null;
}
