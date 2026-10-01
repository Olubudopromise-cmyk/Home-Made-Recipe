/** Accepts an ISO timestamp from Postgres timestamptz, a Date, or null. */
export function timeAgo(t: string | Date | null | undefined): string {
  if (!t) return '';
  const date = typeof t === 'string' ? new Date(t) : t;
  const ms = date.getTime();
  if (Number.isNaN(ms)) return '';
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const FRACTIONS: Array<[number, string]> = [
  [0.125, '⅛'],
  [0.25, '¼'],
  [0.333, '⅓'],
  [0.375, '⅜'],
  [0.5, '½'],
  [0.625, '⅝'],
  [0.667, '⅔'],
  [0.75, '¾'],
  [0.875, '⅞'],
];

/** Formats a scaled amount for display, e.g. 1.5 -> "1 ½", 0.25 -> "¼". */
export function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const whole = Math.floor(n);
  const frac = n - whole;
  let best = '';
  let bestDiff = 0.03;
  for (const [value, symbol] of FRACTIONS) {
    const diff = Math.abs(frac - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = symbol;
    }
  }
  if (best) return (whole > 0 ? `${whole} ` : '') + best;
  return String(Math.round(n * 100) / 100);
}

export function scaleAmount(amount: number | null, factor: number): number | null {
  if (amount == null) return null;
  return Math.round(amount * factor * 100) / 100;
}

export function formatIngredientLine(
  ingredient: { amount: number | null; unit: string; name: string },
  factor = 1,
): string {
  const amount = scaleAmount(ingredient.amount, factor);
  const parts: string[] = [];
  if (amount != null) parts.push(formatAmount(amount));
  if (ingredient.unit) parts.push(ingredient.unit);
  parts.push(ingredient.name);
  return parts.join(' ');
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function prettyDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/).slice(0, 2);
  return words.map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export function isHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Maps Supabase Auth / PostgREST / RLS errors to friendly, honest copy. */
export function friendlyError(err: unknown): string {
  const fallback = 'Something went wrong. Please try again.';
  if (!err || typeof err !== 'object') {
    return err instanceof Error && err.message ? err.message : fallback;
  }
  const code = String((err as { code?: string }).code ?? '');
  const message = String((err as { message?: string }).message ?? '');
  const map: Record<string, string> = {
    // Supabase Auth (GoTrue) codes
    invalid_credentials: 'Incorrect email or password.',
    email_not_confirmed:
      'Confirm your email first — open the confirmation link we sent you, then sign in.',
    user_already_exists: 'An account with that email already exists. Try signing in instead.',
    weak_password: 'Password should be at least 6 characters.',
    over_email_send_rate_limit: 'Too many attempts. Please wait a moment and try again.',
    over_sms_send_rate_limit: 'Too many attempts. Please wait a moment and try again.',
    sms_send_rate_limit: 'Too many attempts. Please wait a moment and try again.',
    otp_expired: 'That verification code has expired — request a new one.',
    session_not_found: 'We could not find that code — request a new one.',
    bad_code: 'That verification code is not correct.',
    validation_failed: 'Please check the details you entered and try again.',
    provider_email_needs_connection:
      'Google sign-in is not configured yet — add the Google provider in Supabase Auth settings.',
    provider_phone_needs_connection:
      'Phone sign-in is not configured yet — connect an SMS provider in Supabase Auth settings.',
    // Row Level Security / PostgREST
    '42501': 'You do not have permission to do that.',
    '23505': 'That already exists.',
    '23503': 'That item no longer exists.',
    '22P02': 'Invalid value supplied.',
    PGRST301: 'Your session has expired — please sign in again.',
  };
  if (map[code]) return map[code];

  const lower = message.toLowerCase();
  if (lower.includes('row-level security')) return 'You do not have permission to do that.';
  if (lower.includes('failed to fetch') || lower.includes('network'))
    return 'Network error. Check your connection and try again.';
  if (lower.includes('sms') && (lower.includes('not configured') || lower.includes('not enabled') || lower.includes('not supported')))
    return 'Phone sign-in is not set up on this project yet — an admin must configure an SMS provider in Supabase Auth → Phone.';
  if (lower.includes('phone') && lower.includes('invalid'))
    return 'Please enter a valid phone number with country code, e.g. +2348012345678.';
  if (lower.includes('invalid format'))
    return 'Please enter a valid phone number with country code, e.g. +2348012345678.';

  return message || fallback;
}
