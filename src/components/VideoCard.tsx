import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfiles } from '../hooks/useProfiles';
import { friendlyError, timeAgo } from '../lib/format';
import { deleteVideo } from '../services/videos';
import type { VideoPost } from '../types';
import { Avatar } from './Avatar';
import { CommentThread } from './CommentThread';
import { FollowButton } from './FollowButton';

export function VideoCard({
  video,
  liked,
  onToggleLike,
  onDeleted,
}: {
  video: VideoPost;
  liked: boolean;
  onToggleLike: (targetId: string, currentlyLiked: boolean) => Promise<void>;
  onDeleted?: (videoId: string) => void;
}) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const profileMap = useProfiles([video.authorId]);
  const author = profileMap[video.authorId];
  const [likeCount, setLikeCount] = useState(video.likeCount);
  const [commentCount, setCommentCount] = useState(video.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setLikeCount(video.likeCount), [video.likeCount]);
  useEffect(() => setCommentCount(video.commentCount), [video.commentCount]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Play only what's actually on screen — a food-feed, not a bandwidth test.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            el.play().catch(() => undefined);
          } else {
            el.pause();
          }
        }
      },
      { threshold: [0, 0.55] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isOwn = user?.uid === video.authorId;

  async function handleLike() {
    setError('');
    const wasLiked = liked;
    try {
      await onToggleLike(video.id, wasLiked);
      setLikeCount((c) => c + (wasLiked ? -1 : 1));
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this video? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteVideo(video.id);
      onDeleted?.(video.id);
    } catch (err) {
      setError(friendlyError(err));
      setDeleting(false);
    }
  }

  return (
    <article className="video-card">
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.imageUrl || undefined}
        controls
        playsInline
        loop
        preload="metadata"
      />

      <div className="video-overlay">
        <div className="video-info">
          <div className="video-creator-row">
            <Link to={`/u/${video.authorId}`} className="video-creator">
              <Avatar user={author} size={36} />
              <strong>{author?.displayName ?? 'Home Cook'}</strong>
            </Link>
            <FollowButton targetUid={video.authorId} size="sm" />
          </div>
          {video.caption ? <p className="video-caption">{video.caption}</p> : null}
          <div className="video-meta">
            <span className="muted small">{timeAgo(video.createdAt)}</span>
            {video.recipeId ? (
              <Link className="recipe-chip recipe-chip-dark" to={`/recipes/${video.recipeId}`}>
                📖 {video.recipeTitle || 'Open recipe'}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="video-rail">
          <button
            type="button"
            className={`rail-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            aria-pressed={liked}
            aria-label="Like video"
          >
            <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
            <span className="rail-count">{likeCount}</span>
          </button>
          <button
            type="button"
            className="rail-btn"
            onClick={() => setShowComments((v) => !v)}
            aria-label="Comments"
          >
            <span aria-hidden="true">💬</span>
            <span className="rail-count">{commentCount}</span>
          </button>
          <button
            type="button"
            className="rail-btn"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
          </button>
          {isOwn ? (
            <button
              type="button"
              className="rail-btn"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete video"
            >
              <span aria-hidden="true">🗑</span>
            </button>
          ) : null}
        </div>
      </div>

      {showComments ? (
        <div className="video-comments">
          <CommentThread
            kind="video"
            targetId={video.id}
            targetAuthorId={video.authorId}
            onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
          />
        </div>
      ) : null}

      {error ? <p className="error-text video-error">{error}</p> : null}
    </article>
  );
}
