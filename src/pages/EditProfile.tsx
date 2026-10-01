import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../lib/format';
import { updateMyProfile } from '../services/users';

export function EditProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio);
      setLocation(profile.location);
      setPhotoURL(profile.photoURL);
    }
  }, [profile]);

  if (loading) return <Spinner label="Checking your session…" />;

  // Ownership is checked here AND server-side by RLS policies.
  if (!user || (uid && user.uid !== uid)) {
    return <Navigate to={uid ? `/u/${uid}` : '/login'} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await updateMyProfile(user.uid, { displayName, bio, location, photoURL });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => navigate(`/u/${user.uid}`), 600);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow">
      <h1 className="page-title">Edit profile</h1>
      <p className="muted">Only you can change this — enforced by database row-level security, not just the UI.</p>

      <form className="card edit-profile-form" onSubmit={handleSubmit}>
        <div className="edit-avatar-row">
          <Avatar user={{ displayName, photoURL }} size={72} />
          <div className="edit-avatar-fields">
            <label>
              Profile photo link
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://…/photo.jpg"
              />
            </label>
            <p className="muted small">
              Photos are shared by URL in this version — media uploads stay modular for later.
            </p>
          </div>
        </div>

        <label>
          Display name
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            required
          />
        </label>

        <label>
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={240}
            rows={3}
            placeholder='e.g. "Nigerian home cook sharing traditional and modern recipes."'
          />
          <span className="muted small">{bio.length}/240</span>
        </label>

        <label>
          Location
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={80}
            placeholder="e.g. Lagos, Nigeria"
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}
        {saved ? <p className="success-text">Profile saved ✓</p> : null}

        <div className="edit-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`/u/${user.uid}`)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
