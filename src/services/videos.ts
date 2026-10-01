import { countOf, supabase } from '../lib/supabase';
import type { VideoPost } from '../types';

const VIDEO_SELECT = `
  id,author_id,caption,video_url,image_url,recipe_id,created_at,
  recipe:recipes(id,title),
  like_count:likes(count),
  comment_count:comments(count)
`;

interface VideoRow {
  id: string;
  author_id: string;
  caption?: string | null;
  video_url: string;
  image_url?: string | null;
  recipe_id?: string | null;
  created_at?: string | null;
  recipe?: { id: string; title: string }[] | { id: string; title: string } | null;
  like_count?: unknown;
  comment_count?: unknown;
}

function firstOf<T>(value: T[] | T | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toVideo(row: VideoRow): VideoPost {
  const recipe = firstOf(row.recipe);
  return {
    id: row.id,
    authorId: row.author_id ?? '',
    caption: row.caption ?? '',
    videoUrl: row.video_url ?? '',
    imageUrl: row.image_url ?? '',
    recipeId: row.recipe_id ?? '',
    recipeTitle: recipe?.title ?? '',
    likeCount: countOf(row.like_count),
    commentCount: countOf(row.comment_count),
    createdAt: row.created_at ?? null,
  };
}

export interface NewVideo {
  authorId: string;
  caption: string;
  videoUrl: string;
  imageUrl?: string;
  recipeId?: string;
  recipeTitle?: string;
}

export async function createVideo(input: NewVideo): Promise<VideoPost> {
  const { data, error } = await supabase()
    .from('videos')
    .insert({
      author_id: input.authorId,
      caption: input.caption.trim(),
      video_url: input.videoUrl.trim(),
      image_url: (input.imageUrl ?? '').trim(),
      recipe_id: input.recipeId || null,
    })
    .select(VIDEO_SELECT)
    .single();
  if (error) throw error;
  return toVideo(data);
}

export async function getVideo(id: string): Promise<VideoPost | null> {
  const { data, error } = await supabase()
    .from('videos')
    .select(VIDEO_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toVideo(data) : null;
}

/** Offset-paged feed: pass the 0-based page number. */
export async function listVideos(
  pageSize = 8,
  page = 0,
): Promise<{ items: VideoPost[]; hasMore: boolean }> {
  const from = page * pageSize;
  const { data, error } = await supabase()
    .from('videos')
    .select(VIDEO_SELECT)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  const items = (data ?? []).map(toVideo);
  return { items, hasMore: items.length === pageSize };
}

export async function listVideosByAuthor(uid: string, max = 50): Promise<VideoPost[]> {
  const { data, error } = await supabase()
    .from('videos')
    .select(VIDEO_SELECT)
    .eq('author_id', uid)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).map(toVideo);
}

/** Real count of a user's videos. */
export async function countVideosByAuthor(uid: string): Promise<number> {
  const { count, error } = await supabase()
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', uid);
  if (error) throw error;
  return count ?? 0;
}

/** Deletes a video (RLS: author only); likes/comments cascade away. */
export async function deleteVideo(id: string): Promise<void> {
  const { data, error } = await supabase()
    .from('videos')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('You can only delete your own videos.');
  }
}
