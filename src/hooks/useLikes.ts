import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchLikedSet, toggleLike } from '../services/likes';
import type { ContentKind } from '../types';

/**
 * Tracks which of the given targets the current user has liked, and exposes a
 * toggle that writes the like for real (rules verify the paired count change).
 */
export function useLikes(kind: ContentKind, targetIds: string[]) {
  const { user } = useAuth();
  const key = [...new Set(targetIds.filter(Boolean))].sort().join(',');
  const [liked, setLiked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !key) {
      setLiked(new Set());
      return;
    }
    let alive = true;
    fetchLikedSet(kind, key.split(','), user.uid)
      .then((set) => {
        if (alive) setLiked(set);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [kind, key, user]);

  const toggle = useCallback(
    async (targetId: string, currentlyLiked: boolean): Promise<void> => {
      if (!user) throw new Error('Sign in to like content.');
      // Optimistic, rolled back on failure.
      setLiked((prev) => {
        const next = new Set(prev);
        if (currentlyLiked) next.delete(targetId);
        else next.add(targetId);
        return next;
      });
      try {
        await toggleLike(kind, targetId, user.uid, currentlyLiked);
      } catch (err) {
        setLiked((prev) => {
          const next = new Set(prev);
          if (currentlyLiked) next.add(targetId);
          else next.delete(targetId);
          return next;
        });
        throw err;
      }
    },
    [kind, user],
  );

  return { liked, toggle };
}
