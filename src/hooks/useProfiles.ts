import { useEffect, useState } from 'react';
import { getProfiles } from '../services/users';
import type { UserProfile } from '../types';

const cache = new Map<string, UserProfile>();
const requested = new Set<string>();

/**
 * Resolves author profiles for feed items. Profiles are cached for the whole
 * session so scrolling back and forth does not re-read the same documents.
 */
export function useProfiles(uids: Array<string | undefined | null>): Record<string, UserProfile> {
  const key = [...new Set(uids.filter((u): u is string => Boolean(u)))].sort().join(',');

  const [profiles, setProfiles] = useState<Record<string, UserProfile>>(() => {
    const initial: Record<string, UserProfile> = {};
    for (const uid of key ? key.split(',') : []) {
      const cached = cache.get(uid);
      if (cached) initial[uid] = cached;
    }
    return initial;
  });

  useEffect(() => {
    if (!key) return;
    const ids = key.split(',');
    const missing = ids.filter((id) => !requested.has(id) && !cache.has(id));
    if (missing.length === 0) {
      // Re-merge from cache in case another consumer filled it.
      const fromCache: Record<string, UserProfile> = {};
      ids.forEach((id) => {
        const cached = cache.get(id);
        if (cached) fromCache[id] = cached;
      });
      setProfiles((prev) => ({ ...fromCache, ...prev }));
      return;
    }
    missing.forEach((id) => requested.add(id));
    let alive = true;
    getProfiles(missing)
      .then((map) => {
        Object.entries(map).forEach(([id, profile]) => cache.set(id, profile));
        if (alive) setProfiles((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {
        missing.forEach((id) => requested.delete(id));
      });
    return () => {
      alive = false;
    };
  }, [key]);

  return profiles;
}
