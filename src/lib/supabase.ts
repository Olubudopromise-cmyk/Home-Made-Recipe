import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;

const url = env.VITE_SUPABASE_URL ?? '';
const anonKey = env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * False until .env.local is filled in — the app shows a setup notice instead
 * of crashing. Only the public anon key ever ships to the browser.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | undefined;

/** Single shared Supabase client (auth session + PostgREST in one). */
export function supabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cached;
}

/**
 * PostgREST returns embedded counts as `[{ count: n }]`. Normalize to a number.
 */
export function countOf(value: unknown): number {
  if (Array.isArray(value)) {
    const first = value[0] as { count?: number | string } | undefined;
    return Number(first?.count ?? 0) || 0;
  }
  if (value == null) return 0;
  return Number(value) || 0;
}
