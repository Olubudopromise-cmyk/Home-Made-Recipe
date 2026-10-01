import { countOf, supabase } from '../lib/supabase';
import type { Post, Topic } from '../types';

/**
 * Row shape returned by PostgREST: the post columns plus embedded recipe
 * title and real like/comment counts (computed by COUNT, never stored).
 */
const POST_SELECT = `
  id,author_id,body,image_url,recipe_id,topic,created_at,
  recipe:recipes(id,title),
  like_count:likes(count),
  comment_count:comments(count)
`;

interface PostRow {
  id: string;
  author_id: string;
  body?: string | null;
  image_url?: string | null;
  recipe_id?: string | null;
  topic?: string | null;
  created_at?: string | null;
  recipe?: { id: string; title: string }[] | { id: string; title: string } | null;
  like_count?: unknown;
  comment_count?: unknown;
}

/** PostgREST returns to-one embeds as an object; the TS types say array. */
function firstOf<T>(value: T[] | T | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toPost(row: PostRow): Post {
  const recipe = firstOf(row.recipe);
  return {
    id: row.id,
    authorId: row.author_id ?? '',
    text: row.body ?? '',
    imageUrl: row.image_url ?? '',
    recipeId: row.recipe_id ?? '',
    recipeTitle: recipe?.title ?? '',
    topic: row.topic === 'lifestyle' ? 'lifestyle' : 'food',
    likeCount: countOf(row.like_count),
    commentCount: countOf(row.comment_count),
    createdAt: row.created_at ?? null,
  };
}

export interface NewPost {
  authorId: string;
  text: string;
  topic: Topic;
  imageUrl?: string;
  recipeId?: string;
  recipeTitle?: string;
}

/** Inserts the post for real — a PostgreSQL write, not optimistic UI. */
export async function createPost(input: NewPost): Promise<Post> {
  const { data, error } = await supabase()
    .from('posts')
    .insert({
      author_id: input.authorId,
      body: input.text.trim(),
      topic: input.topic,
      image_url: (input.imageUrl ?? '').trim(),
      recipe_id: input.recipeId || null,
    })
    .select(POST_SELECT)
    .single();
  if (error) throw error;
  return toPost(data);
}

export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase()
    .from('posts')
    .select(POST_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toPost(data) : null;
}

export async function listRecentPosts(max = 50): Promise<Post[]> {
  const { data, error } = await supabase()
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).map(toPost);
}

export async function listPostsByTopic(topic: Topic, max = 50): Promise<Post[]> {
  const { data, error } = await supabase()
    .from('posts')
    .select(POST_SELECT)
    .eq('topic', topic)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).map(toPost);
}

export async function listPostsByAuthor(uid: string, max = 50): Promise<Post[]> {
  const { data, error } = await supabase()
    .from('posts')
    .select(POST_SELECT)
    .eq('author_id', uid)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).map(toPost);
}

/** Following feed: posts by the people the current user follows. */
export async function listPostsByAuthors(uids: string[], max = 50): Promise<Post[]> {
  if (uids.length === 0) return [];
  const { data, error } = await supabase()
    .from('posts')
    .select(POST_SELECT)
    .in('author_id', uids)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).map(toPost);
}

/** Real count of a user's posts (head request, no rows transferred). */
export async function countPostsByAuthor(uid: string): Promise<number> {
  const { count, error } = await supabase()
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', uid);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Deletes a post. RLS allows only the author; likes and comments disappear
 * through ON DELETE CASCADE. The .select() confirms a row was actually
 * deleted — a blocked delete would otherwise silently no-op.
 */
export async function deletePost(id: string): Promise<void> {
  const { data, error } = await supabase()
    .from('posts')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('You can only delete your own posts.');
  }
}
