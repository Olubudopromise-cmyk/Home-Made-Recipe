import { supabase } from '../lib/supabase';
import type { CommentDoc, ContentKind } from '../types';

const targetColumn = (kind: ContentKind) => (kind === 'post' ? 'post_id' : 'video_id');

interface CommentRow {
  id: string;
  author_id: string;
  body?: string | null;
  created_at?: string | null;
}

function toComment(row: CommentRow): CommentDoc {
  return {
    id: row.id,
    authorId: row.author_id ?? '',
    text: row.body ?? '',
    createdAt: row.created_at ?? null,
  };
}

export async function listComments(kind: ContentKind, targetId: string): Promise<CommentDoc[]> {
  const { data, error } = await supabase()
    .from('comments')
    .select('id,author_id,body,created_at')
    .eq(targetColumn(kind), targetId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(toComment);
}

/** Inserts the comment — RLS requires author_id = the signed-in user. */
export async function addComment(
  kind: ContentKind,
  targetId: string,
  uid: string,
  text: string,
): Promise<void> {
  const { error } = await supabase().from('comments').insert({
    author_id: uid,
    body: text.trim(),
    post_id: kind === 'post' ? targetId : null,
    video_id: kind === 'video' ? targetId : null,
  });
  if (error) throw error;
}

/**
 * Deletes a comment. RLS allows the comment's author or the owner of the
 * post/video it sits on; .select() confirms the row was really removed.
 */
export async function deleteComment(
  kind: ContentKind,
  targetId: string,
  commentId: string,
): Promise<void> {
  const { data, error } = await supabase()
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq(targetColumn(kind), targetId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('You can only delete your own comments.');
  }
}
