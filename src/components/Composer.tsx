import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendlyError, isHttpUrl } from '../lib/format';
import { createPost } from '../services/posts';
import { listRecipes } from '../services/recipes';
import type { Post, Recipe, Topic } from '../types';

const MAX_TEXT = 1000;

/**
 * Real post composer — pressing Post writes to PostgreSQL immediately.
 * Optional photo (URL-based) and optional recipe reference.
 */
export function Composer({
  topic,
  onPosted,
}: {
  topic: Topic;
  onPosted?: (post: Post) => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showPhoto, setShowPhoto] = useState(false);
  const [recipeId, setRecipeId] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    listRecipes(20)
      .then((items) => {
        if (alive) setRecipes(items);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="card composer-guest">
        <p>
          <Link to="/login">Sign in</Link> to share what you&apos;re cooking with the community.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (!isHttpUrl(imageUrl)) {
      setError('Photo must be a valid http(s) link.');
      return;
    }
    const recipe = recipes.find((r) => r.id === recipeId);
    setBusy(true);
    setError('');
    try {
      const post = await createPost({
        authorId: user!.uid,
        text: trimmed,
        topic,
        imageUrl: imageUrl.trim(),
        recipeId: recipe?.id ?? '',
        recipeTitle: recipe?.title ?? '',
      });
      setText('');
      setImageUrl('');
      setShowPhoto(false);
      setRecipeId('');
      setDone(true);
      setTimeout(() => setDone(false), 2500);
      onPosted?.(post);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card composer" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          topic === 'lifestyle'
            ? 'Share a food moment — a restaurant, travel find, or your kitchen life…'
            : "What's cooking? Share a food or cooking moment…"
        }
        maxLength={MAX_TEXT}
        rows={3}
        aria-label="Post text"
      />
      <div className="composer-meta">
        <span className="muted small">
          {text.length}/{MAX_TEXT}
        </span>
        {done ? <span className="success-text">Posted ✓</span> : null}
      </div>

      {showPhoto ? (
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Photo link (https://…)"
          aria-label="Photo URL"
        />
      ) : null}

      <div className="composer-row">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowPhoto((v) => !v)}
        >
          {showPhoto ? 'Remove photo' : '📷 Photo'}
        </button>

        {recipes.length > 0 ? (
          <select
            className="composer-recipe"
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
            aria-label="Attach recipe"
          >
            <option value="">Attach a recipe (optional)</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !text.trim()}
        >
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}
