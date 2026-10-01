import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { VideoCard } from '../components/VideoCard';
import { useAuth } from '../context/AuthContext';
import { useLikes } from '../hooks/useLikes';
import { friendlyError, isHttpUrl } from '../lib/format';
import { createVideo, listVideos } from '../services/videos';
import { listRecipes } from '../services/recipes';
import type { Recipe, VideoPost } from '../types';

export function VideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoPost[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const { liked, toggle } = useLikes('video', videos ? videos.map((v) => v.id) : []);

  // Post-video form
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    let alive = true;
    listVideos(8, 0)
      .then(({ items, hasMore: more }) => {
        if (!alive) return;
        setVideos(items);
        setPage(0);
        setHasMore(more);
      })
      .catch((err) => {
        if (alive) setError(friendlyError(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !showForm) return;
    let alive = true;
    listRecipes(20)
      .then((items) => {
        if (alive) setRecipes(items);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user, showForm]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const nextPage = page + 1;
      const { items, hasMore: more } = await listVideos(8, nextPage);
      setVideos((prev) => [...(prev ?? []), ...items]);
      setPage(nextPage);
      setHasMore(more && items.length > 0);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!user || busy) return;
    setFormError('');
    if (!isHttpUrl(videoUrl) || !videoUrl.trim()) {
      setFormError('Paste a direct video link, e.g. https://…/cooking.mp4');
      return;
    }
    if (!isHttpUrl(posterUrl)) {
      setFormError('Poster must be a valid http(s) link.');
      return;
    }
    const recipe = recipes.find((r) => r.id === recipeId);
    setBusy(true);
    try {
      const video = await createVideo({
        authorId: user.uid,
        caption: caption.trim(),
        videoUrl: videoUrl.trim(),
        imageUrl: posterUrl.trim(),
        recipeId: recipe?.id ?? '',
        recipeTitle: recipe?.title ?? '',
      });
      setVideos((prev) => [video, ...(prev ?? [])]);
      setCaption('');
      setVideoUrl('');
      setPosterUrl('');
      setRecipeId('');
      setPosted(true);
      setShowForm(false);
      setTimeout(() => setPosted(false), 3000);
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="videos-page">
      <div className="videos-header">
        <div>
          <h1 className="page-title">Cooking Videos</h1>
          <p className="muted">Short food videos — tutorials, tips, reviews. Scroll to watch.</p>
        </div>
        <div className="videos-header-actions">
          {posted ? <span className="success-text">Video posted ✓</span> : null}
          {user ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Close' : '🎬 Post video'}
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Sign in to post
            </Link>
          )}
        </div>
      </div>

      {showForm && user ? (
        <form className="card video-form" onSubmit={handlePost}>
          <label>
            Caption
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. How I make Jollof Rice in 30 seconds"
              maxLength={500}
            />
          </label>
          <label>
            Video link (direct file)
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://…/video.mp4"
              required
            />
          </label>
          <p className="muted small">
            Videos are shared as direct http(s) links in this version (an .mp4/.webm file you host
            somewhere) — Supabase Storage uploads can be added later without changing this form.
          </p>
          <label>
            Poster image link (optional)
            <input
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://…/thumbnail.jpg"
            />
          </label>
          {recipes.length > 0 ? (
            <label>
              Connect to a recipe (optional)
              <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
                <option value="">No recipe</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {formError ? <p className="error-text">{formError}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={busy || !caption.trim()}>
            {busy ? 'Posting…' : 'Post video'}
          </button>
        </form>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      {videos === null ? (
        <Spinner label="Loading videos…" />
      ) : videos.length === 0 ? (
        <EmptyState
          emoji="🎥"
          title="No cooking videos yet"
          hint="Post the first one — a 30-second tutorial, a kitchen tip, or a food review."
          action={
            user ? (
              <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
                Post a video
              </button>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Sign in to post
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="video-feed">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                liked={liked.has(video.id)}
                onToggleLike={(id, wasLiked) => toggle(id, wasLiked)}
                onDeleted={(id) => setVideos((prev) => (prev ?? []).filter((v) => v.id !== id))}
              />
            ))}
          </div>
          {hasMore ? (
            <div className="load-more">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more videos'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
