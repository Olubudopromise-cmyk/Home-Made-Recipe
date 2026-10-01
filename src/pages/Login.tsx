import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { friendlyError } from '../lib/format';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Auth methods all come from Supabase Auth:
 *  - Google: OAuth redirect (configure the Google provider in Supabase first)
 *  - Phone:  SMS one-time code (works only once an SMS provider is configured)
 *  - Email:  password sign-in / sign-up as a fallback
 * Nothing here pretends a method is live when the project hasn't configured it.
 */
export function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [busy, setBusy] = useState<'' | 'google' | 'phone' | 'verify' | 'email' | 'signup'>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Phone auth (Supabase phone OTP)
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<'number' | 'code'>('number');

  // Email/password (fallback)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    if (user && !loading) navigate(from, { replace: true });
  }, [user, loading, from, navigate]);

  async function signInGoogle() {
    setError('');
    setBusy('google');
    try {
      const { error: oauthError } = await supabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) throw oauthError;
      // Redirect happens here; the session is picked up on return.
    } catch (err) {
      setError(friendlyError(err));
      setBusy('');
    }
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!phone.trim()) {
      setError('Enter your phone number with country code, e.g. +2348012345678.');
      return;
    }
    setBusy('phone');
    try {
      const { error: otpError } = await supabase().auth.signInWithOtp({
        phone: phone.trim(),
      });
      if (otpError) throw otpError;
      setPhoneStep('code');
      setNotice('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy('');
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!code.trim()) return;
    setBusy('verify');
    try {
      const { error: verifyError } = await supabase().auth.verifyOtp({
        phone: phone.trim(),
        token: code.trim(),
        type: 'sms',
      });
      if (verifyError) throw verifyError;
      navigate(from, { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy('');
    }
  }

  async function signInEmail(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy('email');
    try {
      const { error: signInError } = await supabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      navigate(from, { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy('');
    }
  }

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy('signup');
    try {
      const { data, error: signUpError } = await supabase().auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        navigate(from, { replace: true });
      } else {
        setNotice('Account created — check your inbox for the confirmation link, then sign in.');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy('');
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-page">
        <div className="auth-card card">
          <div className="auth-brand">
            <span aria-hidden="true">🥘</span>
            <h1>Home Made Recipe</h1>
            <p className="muted">Sign-in needs Supabase configuration first.</p>
          </div>
          <p className="muted small">
            Copy <code>.env.example</code> to <code>.env.local</code> and fill in your
            project&apos;s URL and anon key.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-brand">
          <span aria-hidden="true">🥘</span>
          <h1>Home Made Recipe</h1>
          <p className="muted">Join the food community — discover, cook, share.</p>
        </div>

        <button
          type="button"
          className="btn btn-google btn-block"
          onClick={signInGoogle}
          disabled={busy !== ''}
        >
          {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </button>

        <div className="auth-divider">
          <span>or with phone</span>
        </div>

        {phoneStep === 'number' ? (
          <form className="auth-form" onSubmit={sendCode}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number, e.g. +2348012345678"
              aria-label="Phone number"
            />
            <button type="submit" className="btn btn-primary btn-block" disabled={busy !== ''}>
              {busy === 'phone' ? 'Sending code…' : 'Send verification code'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={verifyCode}>
            <p className="muted small">Enter the code sent to {phone}.</p>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Verification code"
              aria-label="Verification code"
            />
            <button type="submit" className="btn btn-primary btn-block" disabled={busy !== ''}>
              {busy === 'verify' ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setPhoneStep('number');
                setCode('');
              }}
            >
              Use a different number
            </button>
          </form>
        )}

        <div className="auth-divider">
          <span>or with email</span>
        </div>

        {showEmail ? (
          <form className="auth-form" onSubmit={signInEmail}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
              autoComplete="email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
              required
            />
            <button type="submit" className="btn btn-secondary btn-block" disabled={busy !== ''}>
              {busy === 'email' ? 'Signing in…' : 'Sign in with email'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={createAccount}
              disabled={busy !== ''}
            >
              {busy === 'signup' ? 'Creating account…' : 'Create account with this email'}
            </button>
          </form>
        ) : (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowEmail(true)}>
            Use email & password instead
          </button>
        )}

        {error ? <p className="error-text">{error}</p> : null}
        {notice ? <p className="success-text">{notice}</p> : null}

        <p className="muted small auth-note">
          Google and phone sign-in need one-time setup in Supabase Auth (Google OAuth + an SMS
          provider) — until then, email/password works as the fallback. Your profile is public —
          your email and phone number are never shown on posts or profiles.
        </p>
      </div>
    </div>
  );
}
