import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { friendlyError, formatIngredientLine, toDateString, timeAgo } from '../lib/format';
import { addMealPlanEntry, addIngredientsToShoppingList } from '../services/kitchen';
import {
  countCooks,
  getRecipe,
  hasCooked,
  isSaved,
  setCooked,
  setSaved,
} from '../services/recipes';
import { getProfile } from '../services/users';
import type { MealSlot, Recipe, UserProfile } from '../types';

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null | 'missing'>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [servings, setServings] = useState(1);
  const [saved, setSavedState] = useState(false);
  const [cooked, setCookedState] = useState(false);
  const [cookCount, setCookCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [planDate, setPlanDate] = useState(toDateString(new Date()));
  const [planServings, setPlanServings] = useState(2);
  const [planMeal, setPlanMeal] = useState<MealSlot>('dinner');
  const [showPlanForm, setShowPlanForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setRecipe(null);
    getRecipe(id)
      .then(async (item) => {
        if (!alive) return;
        if (!item) {
          setRecipe('missing');
          return;
        }
        setRecipe(item);
        setServings(item.servings);
        const cooks = await countCooks(item.id).catch(() => 0);
        if (alive) setCookCount(cooks);
        if (item.authorId) {
          const profile = await getProfile(item.authorId).catch(() => null);
          if (alive) setAuthor(profile);
        }
      })
      .catch((err) => {
        if (alive) setError(friendlyError(err));
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !id || recipe === null || recipe === 'missing') return;
    let alive = true;
    Promise.all([isSaved(id, user.uid), hasCooked(id, user.uid)])
      .then(([isSavedNow, hasCookedNow]) => {
        if (!alive) return;
        setSavedState(isSavedNow);
        setCookedState(hasCookedNow);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user, id, recipe]);

  if (error) return <p className="error-text">{error}</p>;
  if (recipe === null) return <Spinner label="Loading recipe…" />;
  if (recipe === 'missing')
    return <EmptyState emoji="🫥" title="Recipe not found" hint="It may have been deleted." />;

  const factor = servings / recipe.servings;

  async function handleSave() {
    if (!user || !recipe || recipe === 'missing') return;
    setError('');
    try {
      const next = !saved;
      await setSaved(recipe, user.uid, next);
      setSavedState(next);
      setNotice(next ? 'Saved to your profile ✓' : 'Removed from saved.');
      setTimeout(() => setNotice(''), 2500);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function handleCooked() {
    if (!user || !recipe || recipe === 'missing') return;
    setError('');
    try {
      const next = !cooked;
      await setCooked(recipe, user.uid, next);
      setCookedState(next);
      setCookCount((c) => Math.max(0, c + (next ? 1 : -1)));
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function handleAddToShoppingList() {
    if (!user || !recipe || recipe === 'missing') return;
    setError('');
    try {
      const n = await addIngredientsToShoppingList(user.uid, recipe);
      setNotice(`${n} ingredients added to your shopping list ✓`);
      setTimeout(() => setNotice(''), 3500);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function handleAddMealPlan(e: FormEvent) {
    e.preventDefault();
    if (!user || !recipe || recipe === 'missing') return;
    setError('');
    try {
      await addMealPlanEntry(user.uid, {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        date: planDate,
        servings: planServings,
        meal: planMeal,
      });
      setNotice('Added to your meal plan ✓');
      setShowPlanForm(false);
      setTimeout(() => setNotice(''), 2500);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <div className="recipe-detail">
      <div className="recipe-hero card">
        {recipe.imageUrl ? (
          <img className="recipe-hero-img" src={recipe.imageUrl} alt={recipe.title} />
        ) : (
          <div className="recipe-hero-placeholder" aria-hidden="true">
            🍽️
          </div>
        )}
        <div className="recipe-hero-body">
          <div className="chip-row">
            {recipe.cuisine ? <span className="chip chip-active">{recipe.cuisine}</span> : null}
            {recipe.category ? <span className="chip chip-soft">{recipe.category}</span> : null}
          </div>
          <h1>{recipe.title}</h1>
          <p className="muted">{recipe.description}</p>
          <p className="small">
            ⏱ Prep {recipe.prepMinutes} min · Cook {recipe.cookMinutes} min
            {recipe.difficulty ? <> · {recipe.difficulty}</> : null} ·{' '}
            <strong>{cookCount}</strong> {cookCount === 1 ? 'cook has' : 'cooks have'} made this
          </p>
          {author ? (
            <p className="small">
              Recipe by <Link to={`/u/${author.uid}`}>{author.displayName}</Link>
              {author.location ? ` · ${author.location}` : ''} · {timeAgo(recipe.createdAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="card recipe-actions">
        {!user ? (
          <p className="muted small">
            <Link to="/login">Sign in</Link> to save recipes, build a shopping list and plan meals.
          </p>
        ) : (
          <div className="recipe-actions-row">
            <button type="button" className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`} onClick={handleSave}>
              {saved ? '♥ Saved' : '♡ Save recipe'}
            </button>
            <button
              type="button"
              className={`btn ${cooked ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleCooked}
            >
              {cooked ? '✓ Cooked' : '🍲 I Cooked This'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleAddToShoppingList}>
              🛒 Add ingredients
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPlanForm((v) => !v)}
            >
              📅 Add to meal plan
            </button>
          </div>
        )}

        {showPlanForm && user ? (
          <form className="meal-plan-form" onSubmit={handleAddMealPlan}>
            <label>
              Date
              <input
                type="date"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
                required
              />
            </label>
            <label>
              Meal
              <select
                value={planMeal}
                onChange={(e) => setPlanMeal(e.target.value as MealSlot)}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </label>
            <label>
              Servings
              <input
                type="number"
                min={1}
                max={100}
                value={planServings}
                onChange={(e) => setPlanServings(Number(e.target.value))}
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Add to plan
            </button>
          </form>
        ) : null}

        {notice ? <p className="success-text">{notice}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <section className="card">
        <div className="section-head">
          <h2 className="section-title">Ingredients</h2>
          <div className="servings-stepper" role="group" aria-label="Adjust servings">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              aria-label="Fewer servings"
            >
              −
            </button>
            <span className="servings-label">{servings} servings</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setServings((s) => Math.min(100, s + 1))}
              aria-label="More servings"
            >
              +
            </button>
            {servings !== recipe.servings ? (
              <button
                type="button"
                className="link-btn"
                onClick={() => setServings(recipe.servings)}
              >
                reset to {recipe.servings}
              </button>
            ) : null}
          </div>
        </div>
        <ul className="ingredient-list">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={`${ingredient.name}-${index}`}>
              {formatIngredientLine(ingredient, factor)}
            </li>
          ))}
        </ul>
        {recipe.tags.length > 0 ? (
          <div className="chip-row recipe-tags">
            {recipe.tags.map((tag) => (
              <span key={tag} className="chip chip-soft">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="card">
        <h2 className="section-title">Instructions</h2>
        <ol className="instruction-list">
          {recipe.instructions.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
