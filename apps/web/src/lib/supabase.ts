"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Vercel's Supabase integration and newer Supabase projects use one name or the other.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the app was built with a Supabase project. Without one, aimR keeps data on the device only. */
export const accountsEnabled = Boolean(url && key);

/** Google sign-in needs its own setup in Google Cloud and Supabase; set this to "1" once done. */
export const googleEnabled = accountsEnabled && process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "1";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!accountsEnabled || typeof window === "undefined") return null;
  client ??= createClient(url!, key!, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
