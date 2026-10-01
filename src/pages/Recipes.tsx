import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { RecipeCard } from '../components/RecipeCard';
import { Spinner } from '../components/Spinner';
import { friendlyError } from '../lib/format';
import { listRecipes } from '../services/recipes';
import type { Recipe } from '../types';

function matches(recipe: Recipe, search: string): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  const haystack = [
    recipe.title,
    recipe.description,
    recipe.cuisine,
    recipe.category,
    ...recipe.tags,
    ...recipe.ingredients.map((i) => i.name),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

export function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [category, setCategory] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    listRecipes(200)
      .then((items) => {
        if (alive) setRecipes(items);
      })
      .catch((err) => {
        if (alive) setError(friendlyError(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  const cuisines = useMemo(() => {
    const set = new Set((recipes ?? []).map((r) => r.cuisine).filter(Boolean));
    return ['All', ...[...set].sort()];
  }, [recipes]);

  const categories = useMemo(() => {
    const set = new Set((recipes ?? []).map((r) => r.category).filter(Boolean));
    return ['All', ...[...set].sort()];
  }, [recipes]);

  const filtered = (recipes ?? []).filter(
    (r) =>
      matches(r, search.trim()) &&
      (cuisine === 'All' || r.cuisine === cuisine) &&
      (category === 'All' || r.category === category),
  );

  return (
    <div>
      <h1 className="page-title">Recipes</h1>
      <p className="muted">
        Nigerian favourites first — Jollof, Egusi, Pounded Yam, Suya, Moi Moi — plus dishes from
        around the world.
      </p>

      <div className="recipe-toolbar card">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes or ingredients…"
          aria-label="Search recipes"
        />
        <div className="chip-row">
          {cuisines.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${cuisine === c ? 'chip-active' : ''}`}
              onClick={() => setCuisine(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip chip-soft ${category === c ? 'chip-active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {recipes === null ? (
        <Spinner label="Loading recipes…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="🔎"
          title="No recipes match"
          hint="Try a different search, or clear the filters."
          action={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch('');
                setCuisine('All');
                setCategory('All');
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="recipe-grid">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
