import { initials } from '../lib/format';
import type { UserProfile } from '../types';

export function Avatar({
  user,
  size = 40,
}: {
  user?: Pick<UserProfile, 'displayName' | 'photoURL'> | null;
  size?: number;
}) {
  const name = user?.displayName?.trim() || '?';
  if (user?.photoURL) {
    return (
      <img
        className="avatar"
        src={user.photoURL}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className="avatar avatar-fallback"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}
