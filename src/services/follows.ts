import { supabase } from '../lib/supabase';
import { getProfiles } from './users';
import type { UserProfile } from '../types';

/**
 * Toggles a real follow relationship. The follows table's primary key makes
 * duplicates impossible and a CHECK constraint forbids self-follows — both
 * enforced by PostgreSQL, not the frontend.
 */
export async function setFollow(
  followerId: string,
  followedId: string,
  following: boolean,
): Promise<void> {
  if (followerId === followedId) throw new Error('You cannot follow yourself.');
  const client = supabase();
  if (following) {
    const { error } = await client
      .from('follows')
      .insert({ follower_id: followerId, following_id: followedId });
    if (error) {
      if (error.code === '23505') return; // already following — idempotent
      if (error.code === '23514') throw new Error('You cannot follow yourself.');
      throw error;
    }
  } else {
    const { data, error } = await client
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followedId)
      .select('following_id');
    if (error) throw error;
    if (!data || data.length === 0) {
      // Nothing removed — either never followed or already unfollowed.
      return;
    }
  }
}

export async function isFollowing(followerId: string, followedId: string): Promise<boolean> {
  if (!followerId || !followedId) return false;
  const { data, error } = await supabase()
    .from('follows')
    .select('following_id')
    .eq('follower_id', followerId)
    .eq('following_id', followedId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** For a list of candidate creators, which ones does the user already follow? */
export async function fetchFollowingSet(
  followerId: string,
  candidateIds: string[],
): Promise<Set<string>> {
  const set = new Set<string>();
  if (!followerId || candidateIds.length === 0) return set;
  const { data, error } = await supabase()
    .from('follows')
    .select('following_id')
    .eq('follower_id', followerId)
    .in('following_id', candidateIds);
  if (error) throw error;
  (data ?? []).forEach((row) => set.add(row.following_id));
  return set;
}

/** Uids this user follows. */
export async function listFollowingIds(uid: string, max = 500): Promise<string[]> {
  const { data, error } = await supabase()
    .from('follows')
    .select('following_id')
    .eq('follower_id', uid)
    .limit(max);
  if (error) throw error;
  return (data ?? []).map((row) => row.following_id);
}

/** Uids that follow this user. */
export async function listFollowerIds(uid: string, max = 500): Promise<string[]> {
  const { data, error } = await supabase()
    .from('follows')
    .select('follower_id')
    .eq('following_id', uid)
    .limit(max);
  if (error) throw error;
  return (data ?? []).map((row) => row.follower_id);
}

/** Real counts derived from the follows table — never fake numbers. */
export async function countFollowers(uid: string): Promise<number> {
  const { count, error } = await supabase()
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', uid);
  if (error) throw error;
  return count ?? 0;
}

export async function countFollowing(uid: string): Promise<number> {
  const { count, error } = await supabase()
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', uid);
  if (error) throw error;
  return count ?? 0;
}

export async function listFollowerProfiles(uid: string): Promise<UserProfile[]> {
  const ids = await listFollowerIds(uid);
  const map = await getProfiles(ids);
  return ids.map((id) => map[id]).filter((p): p is UserProfile => Boolean(p));
}

export async function listFollowingProfiles(uid: string): Promise<UserProfile[]> {
  const ids = await listFollowingIds(uid);
  const map = await getProfiles(ids);
  return ids.map((id) => map[id]).filter((p): p is UserProfile => Boolean(p));
}
