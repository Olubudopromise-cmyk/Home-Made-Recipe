import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/recipes', label: 'Recipes' },
  { to: '/videos', label: 'Videos' },
  { to: '/lifestyle', label: 'Lifestyle' },
  { to: '/following', label: 'Following' },
];

export function Layout() {
  const { user, profile, signOutUser } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOutUser();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              🥘
            </span>
            <span className="brand-text">Home Made Recipe</span>
          </Link>

          <nav className="main-nav" aria-label="Main">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar-auth">
            {user ? (
              <>
                <Link to={`/u/${user.uid}`} className="nav-profile">
                  <Avatar
                    user={{
                      displayName: profile?.displayName ?? user.displayName ?? 'You',
                      photoURL: profile?.photoURL ?? user.photoURL ?? '',
                    }}
                    size={34}
                  />
                  <span className="nav-profile-name">
                    {profile?.displayName ?? user.displayName ?? 'My profile'}
                  </span>
                </Link>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      <footer className="footer">
        <p>
          <strong>Home Made Recipe</strong> — Nigerian-rooted, globally open. Discover → Learn →
          Cook → Share → Watch → Follow.
        </p>
        <p className="muted small">
          Food, cooking and lifestyle only. Runs on Supabase — media is shared by URL.
        </p>
      </footer>
    </div>
  );
}
