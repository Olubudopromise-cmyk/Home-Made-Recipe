import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfiles } from '../hooks/useProfiles';
import { friendlyError, timeAgo } from '../lib/format';
import { deletePost } from '../services/posts';
import type { Post } from '../types';
import { Avatar } from './Avatar';

export function PostCard({
  post,
  liked,
  onToggleLike,
  showTopic = false,
  onDeleted,
}: {
  post: Post;
  liked: boolean;
  onToggleLike: (targetId: string, currentlyLiked: boolean) => Promise<void>;
  showTopic?: boolean;
  onDeleted?: (postId: string) => void;
}) {
  const { user } = useAuth();
  const profileMap = useProfiles([post.authorId]);
  const author = profileMap[post.authorId];
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setLikeCount(post.likeCount), [post.likeCount]);

  const isOwn = user?.uid === post.authorId;

  async function handleLike() {
    setError('');
    const wasLiked = liked;
    try {
      await onToggleLike(post.id, wasLiked);
      setLikeCount((c) => c + (wasLiked ? -1 : 1));
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try {
      await deletePost(post.id);
      onDeleted?.(post.id);
    } catch (err) {
      setError(friendlyError(err));
      setDeleting(false);
    }
  }

  return (
    <article className="post-card">
      <div className="post-head">
        <Link to={`/u/${post.authorId}`} className="post-author">
          <Avatar user={author} size={42} />
          <span className="post-author-text">
            <strong>{author?.displayName ?? 'Home Cook'}</strong>
            <span className="muted"> · {timeAgo(post.createdAt)}</span>
          </span>
        </Link>
        <div className="post-head-right">
          {showTopic && post.topic === 'lifestyle' ? (
            <span className="badge badge-lifestyle">Lifestyle</span>
          ) : null}
          {isOwn ? (
            <button type="button" className="link-btn danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : null}
        </div>
      </div>

      <p className="post-text">{post.text}</p>

      {post.imageUrl ? (
        <img
          className="post-image"
          src={post.imageUrl}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}

      {post.recipeId ? (
        <Link className="recipe-chip" to={`/recipes/${post.recipeId}`}>
          📖 {post.recipeTitle || 'Open recipe'}
        </Link>
      ) : null}

      <div className="post-actions">
        <button
          type="button"
          className={`action-btn ${liked ? 'liked' : ''}`}
          onClick={handleLike}
          aria-pressed={liked}
        >
          {liked ? '♥' : '♡'} {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </button>
        <Link className="action-btn" to={`/posts/${post.id}`}>
          💬 {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </Link>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </article>
  );
}
