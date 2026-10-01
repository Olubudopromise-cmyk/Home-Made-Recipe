import { useEffect, useState } from 'react';
import { Composer } from '../components/Composer';
import { EmptyState } from '../components/EmptyState';
import { PostCard } from '../components/PostCard';
import { Spinner } from '../components/Spinner';
import { useLikes } from '../hooks/useLikes';
import { friendlyError } from '../lib/format';
import { listPostsByTopic } from '../services/posts';
import type { Post } from '../types';

export function LifestylePage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState('');
  const { liked, toggle } = useLikes('post', posts ? posts.map((p) => p.id) : []);

  useEffect(() => {
    let alive = true;
    listPostsByTopic('lifestyle', 50)
      .then((items) => {
        if (alive) setPosts(items);
      })
      .catch((err) => {
        if (alive) setError(friendlyError(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="narrow">
      <h1 className="page-title">Food Lifestyle</h1>
      <p className="muted">
        Restaurants, dining, travel, kitchen life and food culture — anything around food that
        isn&apos;t a formal recipe.
      </p>

      <Composer
        topic="lifestyle"
        onPosted={(post) => setPosts((prev) => [post, ...(prev ?? [])])}
      />

      {error ? <p className="error-text">{error}</p> : null}

      {posts === null ? (
        <Spinner label="Loading lifestyle posts…" />
      ) : posts.length === 0 ? (
        <EmptyState
          emoji="✈️"
          title="No lifestyle posts yet"
          hint='Try: "Tried this small restaurant in Lagos today. The jollof was incredible."'
        />
      ) : (
        <div className="feed">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={liked.has(post.id)}
              onToggleLike={(id, wasLiked) => toggle(id, wasLiked)}
              showTopic
              onDeleted={(id) => setPosts((prev) => (prev ?? []).filter((p) => p.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
