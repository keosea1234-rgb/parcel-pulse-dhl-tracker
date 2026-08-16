"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

function configuration() {
  const environment = typeof process === "undefined" ? undefined : process.env;
  return { url: environment?.NEXT_PUBLIC_SUPABASE_URL ?? "", publishableKey: environment?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" };
}

export function getSupabaseBrowserClient() {
  const { url, publishableKey } = configuration();
  if (!url || !publishableKey) throw new Error("Supabase authentication is not configured for this environment.");
  if (!client) client = createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}
