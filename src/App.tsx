import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import { Layout } from './components/Layout';
import { Spinner } from './components/Spinner';
import { HomePage } from './pages/Home';
import { FollowingPage } from './pages/Following';
import { LifestylePage } from './pages/Lifestyle';
import { LoginPage } from './pages/Login';
import { PostDetailPage } from './pages/PostDetail';
import { ProfilePage } from './pages/Profile';
import { EditProfilePage } from './pages/EditProfile';
import { RecipeDetailPage } from './pages/RecipeDetail';
import { RecipesPage } from './pages/Recipes';
import { VideosPage } from './pages/Videos';

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

function SetupNotice() {
  return (
    <div className="setup-notice">
      <h1>🥘 Home Made Recipe</h1>
      <p>The app needs your Supabase project&apos;s URL and anon key to run.</p>
      <ol>
        <li>
          Copy <code>.env.example</code> to <code>.env.local</code>.
        </li>
        <li>
          Fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> from
          your Supabase project (Settings → API).
        </li>
        <li>Restart the dev server.</li>
      </ol>
      <p className="muted">
        See README.md for the full setup: running the schema + RLS SQL, enabling Google/Phone
        sign-in, and the two-user test checklist.
      </p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="card">
      <h1>404 — nothing on the menu here</h1>
      <p>
        <a href="/">Back to Home</a>
      </p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : (
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="recipes" element={<RecipesPage />} />
            <Route path="recipes/:id" element={<RecipeDetailPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="lifestyle" element={<LifestylePage />} />
            <Route path="posts/:id" element={<PostDetailPage />} />
            <Route path="u/:uid" element={<ProfilePage />} />
            <Route element={<RequireAuth />}>
              <Route path="following" element={<FollowingPage />} />
              <Route path="u/:uid/edit" element={<EditProfilePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </BrowserRouter>
      )}
    </AuthProvider>
  );
}
