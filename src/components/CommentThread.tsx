import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfiles } from '../hooks/useProfiles';
import { friendlyError, timeAgo } from '../lib/format';
import { addComment, deleteComment, listComments } from '../services/comments';
import type { CommentDoc, ContentKind } from '../types';
import { Avatar } from './Avatar';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';

export function CommentThread({
  kind,
  targetId,
  targetAuthorId,
  onCountChange,
}: {
  kind: ContentKind;
  targetId: string;
  targetAuthorId?: string;
  onCountChange?: (delta: number) => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentDoc[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const authors = useProfiles(comments ? comments.map((c) => c.authorId) : []);

  useEffect(() => {
    let alive = true;
    setComments(null);
    listComments(kind, targetId)
      .then((items) => {
        if (alive) setComments(items);
      })
      .catch((err) => {
        if (alive) {
          setError(friendlyError(err));
          setComments([]);
        }
      });
    return () => {
      alive = false;
    };
  }, [kind, targetId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || busy) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError('');
    try {
      await addComment(kind, targetId, user.uid, trimmed);
      setComments((prev) => [
        ...(prev ?? []),
        { id: `local-${Date.now()}`, authorId: user.uid, text: trimmed, createdAt: null },
      ]);
      setText('');
      onCountChange?.(1);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(comment: CommentDoc) {
    if (!user) return;
    setError('');
    try {
      await deleteComment(kind, targetId, comment.id);
      setComments((prev) => (prev ?? []).filter((c) => c.id !== comment.id));
      onCountChange?.(-1);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <div className="comment-thread">
      {comments === null ? (
        <Spinner label="Loading comments…" />
      ) : comments.length === 0 ? (
        <EmptyState emoji="💬" title="No comments yet" hint="Be the first to say something kind about this food." />
      ) : (
        <ul className="comment-list">
          {comments.map((comment) => {
            const author = authors[comment.authorId];
            const canDelete = user && (comment.authorId === user.uid || targetAuthorId === user.uid);
            return (
              <li key={comment.id} className="comment-item">
                <Link to={`/u/${comment.authorId}`} className="comment-avatar">
                  <Avatar user={author} size={32} />
                </Link>
                <div className="comment-body">
                  <p className="comment-meta">
                    <Link to={`/u/${comment.authorId}`} className="comment-author">
                      {author?.displayName ?? 'Home Cook'}
                    </Link>
                    <span className="muted"> · {timeAgo(comment.createdAt)}</span>
                  </p>
                  <p className="comment-text">{comment.text}</p>
                </div>
                {canDelete ? (
                  <button
                    type="button"
                    className="link-btn danger"
                    onClick={() => handleDelete(comment)}
                    aria-label="Delete comment"
                  >
                    Delete
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className="error-text">{error}</p> : null}

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <Avatar user={{ displayName: user.displayName ?? 'You', photoURL: user.photoURL ?? '' }} size={32} />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={1000}
            aria-label="Add a comment"
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>
            {busy ? 'Posting…' : 'Comment'}
          </button>
        </form>
      ) : (
        <p className="muted small">
          <Link to="/login">Sign in</Link> to comment.
        </p>
      )}
    </div>
  );
}
