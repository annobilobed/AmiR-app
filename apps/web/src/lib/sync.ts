"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { pickSynced, useAimr, type SyncedData } from "./store";

/*
 * Local-first sync. The phone's copy is always what the app shows, so aimR works offline. When the
 * student is signed in, changes are saved to their account a moment after they stop typing, and
 * retried when the connection comes back.
 *
 * First sign-in on a phone that already has data, while the account also has data, is the one case
 * where aimR cannot know which copy is right: it stops and asks the student (status "choose").
 */

export type SyncStatus = "off" | "signed-out" | "syncing" | "saved" | "offline" | "error" | "choose";

interface SyncState {
  status: SyncStatus;
  session: Session | null;
  /** The account's copy, while the student chooses between it and this phone's data. */
  remote: (SyncedData & { updatedAt: string }) | null;
  error: string | null;
}

let state: SyncState = { status: "off", session: null, remote: null, error: null };
const listeners = new Set<() => void>();
function update(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useSync(): SyncState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

const hasData = (d: SyncedData) => d.profile !== null;

async function push() {
  const sb = supabase();
  if (!sb || !state.session) return;
  if (!navigator.onLine) return update({ status: "offline" });
  const s = useAimr.getState();
  if (!s.profile || (s.syncedAt !== null && s.updatedAt <= s.syncedAt)) return update({ status: "saved" });
  const snapshotAt = s.updatedAt;
  update({ status: "syncing" });
  const { error } = await sb.rpc("save_state", { state: pickSynced(s) });
  if (error) return update({ status: navigator.onLine ? "error" : "offline", error: error.message });
  useAimr.getState().markSynced(snapshotAt);
  update({ status: "saved", error: null });
}

/** Runs after sign-in and on app start: decides whether to load, save, or ask. */
async function reconcile() {
  const sb = supabase();
  if (!sb || !state.session) return;
  if (!navigator.onLine) return update({ status: "offline" });
  update({ status: "syncing" });
  const { data, error } = await sb.rpc("load_state");
  if (error) return update({ status: "error", error: error.message });
  const remote = data as (SyncedData & { updatedAt: string }) | null;
  const local = useAimr.getState();
  const dirty = local.syncedAt === null || local.updatedAt > local.syncedAt;

  if (!remote) return push(); // new account: save this phone's data (if any)
  const remoteAt = Date.parse(remote.updatedAt);
  if (!hasData(local)) {
    useAimr.getState().applySynced(remote, remoteAt);
    return update({ status: "saved" });
  }
  if (local.syncedAt === null) return update({ status: "choose", remote }); // both have data: ask
  if (dirty) return push(); // changes made on this phone since the last save
  if (remoteAt > local.syncedAt) useAimr.getState().applySynced(remote, remoteAt); // newer elsewhere
  update({ status: "saved" });
}

/** The student's answer when both this phone and the account have data. */
export async function resolveChoice(keep: "account" | "phone") {
  const remote = state.remote;
  update({ remote: null });
  if (keep === "account" && remote) {
    const at = Date.parse(remote.updatedAt);
    useAimr.getState().applySynced(remote, at);
    return update({ status: "saved" });
  }
  useAimr.setState({ syncedAt: 0 }); // treat this phone's data as unsaved, then save it
  return push();
}

/** Mount once: follows the sign-in state and saves changes in the background. */
export function useSyncEngine() {
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    update({ status: "signed-out" });

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const was = state.session?.user.id;
      update({ session, status: session ? state.status : "signed-out" });
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION") && was !== session.user.id) void reconcile();
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useAimr.subscribe((s, prev) => {
      if (s.updatedAt === prev.updatedAt || !state.session || state.status === "choose") return;
      clearTimeout(timer);
      timer = setTimeout(() => void push(), 1500);
    });
    const online = () => state.session && void reconcile();
    const offline = () => state.session && update({ status: "offline" });
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      sub.subscription.unsubscribe();
      unsub();
      clearTimeout(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
}

export async function signOut() {
  const sb = supabase();
  if (!sb) return;
  await push(); // save anything pending first
  await sb.auth.signOut();
  update({ session: null, status: "signed-out", remote: null });
  // The data is safe in the account; clear this phone so the next person sees nothing of it.
  useAimr.getState().reset();
}

/** Deletes the account and everything saved in it; this phone's copy is cleared too. */
export async function deleteAccount(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Accounts are not set up.";
  const { error } = await sb.rpc("delete_my_account");
  if (error) return error.message;
  await sb.auth.signOut();
  useAimr.getState().reset();
  update({ session: null, status: "signed-out", remote: null });
  return null;
}

/** For tests only. */
export const __test = { update, reconcile, push, get: () => state };
