import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CommentThread } from '../components/CommentThread';
import { EmptyState } from '../components/EmptyState';
import { PostCard } from '../components/PostCard';
import { Spinner } from '../components/Spinner';
import { useLikes } from '../hooks/useLikes';
import { friendlyError } from '../lib/format';
import { getPost } from '../services/posts';
import type { Post } from '../types';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null | 'missing'>(null);
  const [error, setError] = useState('');
  const { liked, toggle } = useLikes('post', post && post !== 'missing' ? [post.id] : []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setPost(null);
    getPost(id)
      .then((item) => {
        if (alive) setPost(item ?? 'missing');
      })
      .catch((err) => {
        if (alive) setError(friendlyError(err));
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) return <p className="error-text">{error}</p>;
  if (post === null) return <Spinner label="Loading post…" />;
  if (post === 'missing')
    return (
      <EmptyState emoji="🫥" title="This post no longer exists" hint="It may have been deleted by its author." />
    );

  return (
    <div className="narrow">
      <PostCard
        post={post}
        liked={liked.has(post.id)}
        onToggleLike={(postId, wasLiked) => toggle(postId, wasLiked)}
        showTopic
        onDeleted={() => setPost('missing')}
      />
      <section className="card">
        <h2 className="section-title">Comments</h2>
        <CommentThread
          kind="post"
          targetId={post.id}
          targetAuthorId={post.authorId}
          onCountChange={(delta) => setPost((prev) => (prev === 'missing' || prev === null ? prev : { ...prev, commentCount: Math.max(0, prev.commentCount + delta) }))}
        />
      </section>
    </div>
  );
}
