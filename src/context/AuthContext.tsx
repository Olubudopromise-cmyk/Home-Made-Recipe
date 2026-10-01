import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { friendlyError } from '../lib/format';
import { getProfile, ensureProfile } from '../services/users';
import type { UserProfile } from '../types';

/**
 * The app-facing signed-in user. Supabase Auth is the only source of truth —
 * never localStorage. Shape kept small and stable so components don't depend
 * on provider internals.
 */
export interface AppUser {
  uid: string;
  displayName: string;
  photoURL: string;
}

interface AuthContextValue {
  user: AppUser | null;
  profile: UserProfile | null;
  /** True while the initial session + profile lookup is running. */
  loading: boolean;
  error: string;
  refreshProfile: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: false,
  error: '',
  refreshProfile: async () => {},
  signOutUser: async () => {},
});

function metaName(u: User): string {
  const m = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  return (m.full_name || m.name || '').trim();
}

function toAppUser(u: User): AppUser {
  const m = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  const photo = m.avatar_url || m.picture || '';
  return {
    uid: u.id,
    displayName: metaName(u).slice(0, 60) || 'Home Cook',
    photoURL: /^https?:\/\//.test(photo) ? photo : '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      return;
    }
    try {
      // The auth trigger normally created the row already; ensureProfile is a
      // safe fallback (owner-only insert, on conflict do nothing).
      const existing = await getProfile(u.id);
      const row = existing ?? (await ensureProfile(u.id, toAppUser(u)));
      setProfile(row);
    } catch (err) {
      setError(friendlyError(err));
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let alive = true;
    const client = supabase();

    client.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        const u = data.session?.user ?? null;
        setUser(u ? toAppUser(u) : null);
        loadProfile(u)
          .catch(() => undefined)
          .finally(() => {
            if (alive) setLoading(false);
          });
      })
      .catch(() => {
        if (alive) setLoading(false);
      });

    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        return;
      }
      const u = session?.user ?? null;
      setUser(u ? toAppUser(u) : null);
      loadProfile(u).catch(() => undefined);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await loadProfile(await currentAuthUser());
  }, [loadProfile]);

  const signOutUser = useCallback(async () => {
    if (isSupabaseConfigured) await supabase().auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, error, refreshProfile, signOutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

async function currentAuthUser(): Promise<User | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.user ?? null;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
