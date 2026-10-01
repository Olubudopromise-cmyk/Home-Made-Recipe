import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

const PROFILE_COLS = 'id,display_name,bio,photo_url,location,created_at';

interface ProfileRow {
  id: string;
  display_name?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  location?: string | null;
  created_at?: string | null;
}

export function toProfile(row: ProfileRow): UserProfile {
  return {
    uid: row.id,
    displayName: row.display_name?.trim() || 'Home Cook',
    photoURL: row.photo_url ?? '',
    bio: row.bio ?? '',
    location: row.location ?? '',
    createdAt: row.created_at ?? null,
  };
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  const { data, error } = await supabase()
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data) : null;
}

/**
 * Fallback profile creation when the auth trigger hasn't produced a row
 * (owner-only insert — RLS requires id = auth.uid(), conflicts ignored).
 */
export async function ensureProfile(uid: string, seed: Partial<UserProfile>): Promise<UserProfile> {
  const { data, error } = await supabase()
    .from('profiles')
    .upsert(
      {
        id: uid,
        display_name: (seed.displayName ?? 'Home Cook').slice(0, 60),
        photo_url: seed.photoURL ?? '',
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select(PROFILE_COLS)
    .maybeSingle();
  if (error) throw error;
  if (data) return toProfile(data);
  const again = await getProfile(uid);
  if (!again) throw new Error('Could not load your profile.');
  return again;
}

/** Batch profile lookup for feeds (one query, missing profiles skipped). */
export async function getProfiles(uids: string[]): Promise<Record<string, UserProfile>> {
  const unique = [...new Set(uids.filter(Boolean))];
  const map: Record<string, UserProfile> = {};
  if (unique.length === 0) return map;
  const { data, error } = await supabase()
    .from('profiles')
    .select(PROFILE_COLS)
    .in('id', unique);
  if (error) throw error;
  (data ?? []).forEach((row) => {
    map[row.id] = toProfile(row);
  });
  return map;
}

export async function listRecentUsers(max = 12): Promise<UserProfile[]> {
  const { data, error } = await supabase()
    .from('profiles')
    .select(PROFILE_COLS)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).map(toProfile);
}

export interface ProfileEdit {
  displayName: string;
  bio: string;
  location: string;
  photoURL: string;
}

/** Owner-only profile update (enforced server-side by RLS, not just the UI). */
export async function updateMyProfile(uid: string, edit: ProfileEdit): Promise<void> {
  const { error } = await supabase()
    .from('profiles')
    .update({
      display_name: edit.displayName.trim().slice(0, 60),
      bio: edit.bio.trim().slice(0, 240),
      location: edit.location.trim().slice(0, 80),
      photo_url: edit.photoURL.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', uid);
  if (error) throw error;
}
