import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendlyError, formatIngredientLine, prettyDate, toDateString } from '../lib/format';
import {
  clearCheckedShoppingItems,
  listMealPlan,
  listShoppingList,
  removeMealPlanEntry,
  removeShoppingItem,
  setShoppingItemChecked,
} from '../services/kitchen';
import { listCookedHistory, listSavedRecipes, setSaved } from '../services/recipes';
import type { MealPlanEntry, Recipe, SavedRecipe, ShoppingItem } from '../types';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';

/**
 * The signed-in cook's private kitchen: saved recipes, cooking history,
 * shopping list and meal plan. All reads/writes are owner-only via RLS.
 */
export function KitchenPanel({ uid }: { uid: string }) {
  const { user } = useAuth();
  const [saved, setSavedList] = useState<SavedRecipe[] | null>(null);
  const [cooked, setCookedList] = useState<Array<{ recipeId: string; title: string }> | null>(null);
  const [shopping, setShopping] = useState<ShoppingItem[] | null>(null);
  const [plan, setPlan] = useState<MealPlanEntry[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isOwner = user?.uid === uid;

  useEffect(() => {
    if (!isOwner) return;
    let alive = true;
    Promise.all([
      listSavedRecipes(uid).catch(() => [] as SavedRecipe[]),
      listCookedHistory(uid).catch(() => []),
      listShoppingList(uid).catch(() => [] as ShoppingItem[]),
      listMealPlan(uid).catch(() => [] as MealPlanEntry[]),
    ])
      .then(([savedItems, cookedItems, shopItems, planItems]) => {
        if (!alive) return;
        setSavedList(savedItems);
        setCookedList(cookedItems);
        setShopping(shopItems);
        setPlan(planItems);
      })
      .catch((err) => {
        if (alive) setError(friendlyError(err));
      });
    return () => {
      alive = false;
    };
  }, [uid, isOwner]);

  if (!isOwner) return null;
  if (saved === null || cooked === null || shopping === null || plan === null) {
    return <Spinner label="Loading your kitchen…" />;
  }

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  }

  async function handleUnsave(recipeId: string) {
    const snapshot = saved?.find((s) => s.recipeId === recipeId);
    if (!snapshot || !user) return;
    setError('');
    try {
      const asRecipe: Recipe = {
        id: snapshot.recipeId,
        title: snapshot.title,
        description: '',
        cuisine: snapshot.cuisine,
        category: snapshot.category,
        tags: [],
        servings: 1,
        prepMinutes: 0,
        cookMinutes: 0,
        difficulty: '',
        ingredients: [],
        instructions: [],
        imageUrl: snapshot.imageUrl,
        authorId: '',
        createdAt: null,
      };
      await setSaved(asRecipe, user.uid, false);
      setSavedList((prev) => (prev ?? []).filter((s) => s.recipeId !== recipeId));
      flash('Removed from saved.');
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function handleToggleItem(item: ShoppingItem) {
    if (!user) return;
    try {
      await setShoppingItemChecked(user.uid, item, !item.checked);
      setShopping((prev) =>
        (prev ?? []).map((i) => (i.id === item.id ? { ...i, checked: !item.checked } : i)),
      );
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!user) return;
    try {
      await removeShoppingItem(user.uid, itemId);
      setShopping((prev) => (prev ?? []).filter((i) => i.id !== itemId));
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function handleClearChecked() {
    if (!user) return;
    try {
      const n = await clearCheckedShoppingItems(user.uid);
      setShopping((prev) => (prev ?? []).filter((i) => !i.checked));
      flash(`${n} checked item${n === 1 ? '' : 's'} cleared.`);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function handleRemoveEntry(entryId: string) {
    if (!user) return;
    try {
      await removeMealPlanEntry(user.uid, entryId);
      setPlan((prev) => (prev ?? []).filter((e) => e.id !== entryId));
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  const checkedCount = shopping.filter((i) => i.checked).length;
  const planByDate = new Map<string, MealPlanEntry[]>();
  plan.forEach((entry) => {
    const list = planByDate.get(entry.date) ?? [];
    list.push(entry);
    planByDate.set(entry.date, list);
  });
  const planDates = [...planByDate.keys()].sort();

  return (
    <div className="kitchen">
      {notice ? <p className="success-text">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="card">
        <h2 className="section-title">Saved recipes</h2>
        {saved.length === 0 ? (
          <EmptyState
            emoji="🔖"
            title="No saved recipes yet"
            hint="Open a recipe and tap Save recipe — it stays private to you."
          />
        ) : (
          <ul className="kitchen-list">
            {saved.map((item) => (
              <li key={item.recipeId} className="kitchen-row">
                <Link to={`/recipes/${item.recipeId}`}>{item.title}</Link>
                <span className="muted small">{item.cuisine}</span>
                <button type="button" className="link-btn danger" onClick={() => handleUnsave(item.recipeId)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">I Cooked This</h2>
        {cooked.length === 0 ? (
          <EmptyState
            emoji="🍲"
            title="You haven't marked a cook yet"
            hint="Open a recipe you made and tap I Cooked This."
          />
        ) : (
          <ul className="kitchen-list">
            {cooked.map((item) => (
              <li key={item.recipeId} className="kitchen-row">
                <Link to={`/recipes/${item.recipeId}`}>{item.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="section-head">
          <h2 className="section-title">Shopping list</h2>
          {checkedCount > 0 ? (
            <button type="button" className="link-btn" onClick={handleClearChecked}>
              Clear {checkedCount} checked
            </button>
          ) : null}
        </div>
        {shopping.length === 0 ? (
          <EmptyState
            emoji="🛒"
            title="Your shopping list is empty"
            hint="On any recipe, tap Add ingredients to fill it."
          />
        ) : (
          <ul className="shopping-list">
            {shopping.map((item) => (
              <li key={item.id} className={`shopping-row${item.checked ? ' checked' : ''}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleItem(item)}
                  />
                  <span>{formatIngredientLine({ amount: item.amount, unit: item.unit, name: item.name })}</span>
                </label>
                <span className="shopping-row-actions">
                  {item.recipeTitle ? (
                    <Link className="muted small" to={`/recipes/${item.recipeId}`}>
                      {item.recipeTitle}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="link-btn danger"
                    onClick={() => handleRemoveItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Meal plan</h2>
        {plan.length === 0 ? (
          <EmptyState
            emoji="📅"
            title="No meals planned"
            hint="Open a recipe and tap Add to meal plan."
          />
        ) : (
          planDates.map((date) => (
            <div key={date} className="plan-day">
              <h3 className="plan-date">
                {date === toDateString(new Date()) ? 'Today · ' : ''}
                {prettyDate(date)}
              </h3>
              <ul className="kitchen-list">
                {(planByDate.get(date) ?? []).map((entry) => (
                  <li key={entry.id} className="kitchen-row">
                    <Link to={`/recipes/${entry.recipeId}`}>{entry.recipeTitle}</Link>
                    <span className="muted small">
                      {entry.meal} · {entry.servings} servings
                    </span>
                    <button
                      type="button"
                      className="link-btn danger"
                      onClick={() => handleRemoveEntry(entry.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
