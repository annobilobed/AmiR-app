"use client";

import { useSyncEngine } from "@/lib/sync";

/** Mounted once in the root layout: keeps the phone's data and the student's account in step. */
export function SyncEngine() {
  useSyncEngine();
  return null;
}
