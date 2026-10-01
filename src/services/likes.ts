import { supabase } from '../lib/supabase';
import type { ContentKind } from '../types';

/**
 * Toggles a like by inserting/deleting the single likes row.
 * Counts are never stored — the feed computes them with COUNT, so a like
 * and its count can never drift apart.
 */
export async function toggleLike(
  kind: ContentKind,
  targetId: string,
  uid: string,
  currentlyLiked: boolean,
): Promise<void> {
  const client = supabase();
  if (currentlyLiked) {
    const query = client.from('likes').delete().eq('user_id', uid);
    const { error } = await (kind === 'post'
      ? query.eq('post_id', targetId)
      : query.eq('video_id', targetId));
    if (error) throw error;
    return;
  }
  const { error } = await client.from('likes').insert({
    user_id: uid,
    post_id: kind === 'post' ? targetId : null,
    video_id: kind === 'video' ? targetId : null,
  });
  if (error) {
    // Unique violation = already liked (double-click race) — treat as done.
    if (error.code === '23505') return;
    throw error;
  }
}

/** Which of the given targets the user has liked — one `in` query. */
export async function fetchLikedSet(
  kind: ContentKind,
  targetIds: string[],
  uid: string,
): Promise<Set<string>> {
  const liked = new Set<string>();
  if (!uid || targetIds.length === 0) return liked;
  const column = kind === 'post' ? 'post_id' : 'video_id';
  const { data, error } = await supabase()
    .from('likes')
    .select(column)
    .eq('user_id', uid)
    .in(column, targetIds);
  if (error) throw error;
  (data ?? []).forEach((row) => {
    const value = (row as Record<string, string | null>)[column];
    if (value) liked.add(value);
  });
  return liked;
}
