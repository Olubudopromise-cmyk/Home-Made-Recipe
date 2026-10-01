import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../lib/format';
import { isFollowing, setFollow } from '../services/follows';

export function FollowButton({
  targetUid,
  size = 'md',
  onDidChange,
}: {
  targetUid: string;
  size?: 'sm' | 'md';
  onDidChange?: (following: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!user) {
      setFollowing(false);
      return;
    }
    if (user.uid === targetUid) {
      setFollowing(false);
      return;
    }
    isFollowing(user.uid, targetUid)
      .then((value) => {
        if (alive) setFollowing(value);
      })
      .catch(() => {
        if (alive) setFollowing(false);
      });
    return () => {
      alive = false;
    };
  }, [user, targetUid]);

  if (user && user.uid === targetUid) return null;

  const isFollowingNow = following === true;

  async function handleClick() {
    setError('');
    if (!user) {
      navigate('/login');
      return;
    }
    if (following === null || busy) return;
    const next = !following;
    setBusy(true);
    setFollowing(next);
    try {
      await setFollow(user.uid, targetUid, next);
      onDidChange?.(next);
    } catch (err) {
      setFollowing(!next);
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="follow-wrap">
      <button
        type="button"
        className={`btn ${size === 'sm' ? 'btn-sm' : ''} ${
          isFollowingNow ? 'btn-secondary' : 'btn-primary'
        }`}
        onClick={handleClick}
        disabled={busy || following === null}
        aria-pressed={isFollowingNow}
      >
        {following === null ? '…' : isFollowingNow ? 'Following' : 'Follow'}
      </button>
      {error ? <span className="error-text">{error}</span> : null}
    </span>
  );
}
