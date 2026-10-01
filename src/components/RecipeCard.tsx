import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Recipe } from '../types';

const CATEGORY_EMOJI: Record<string, string> = {
  Soups: '🍲',
  'Rice & Grains': '🍚',
  'Rice and Grains': '🍚',
  Grills: '🍢',
  Snacks: '🥟',
  'Quick Meals': '⚡',
  Vegetarian: '🥗',
  Breakfast: '🥞',
  Desserts: '🍰',
  Drinks: '🥤',
};

export function RecipeCard({
  recipe,
  action,
}: {
  recipe: Recipe;
  action?: ReactNode;
}) {
  const emoji = CATEGORY_EMOJI[recipe.category] ?? '🍽️';
  return (
    <div className="recipe-card">
      <Link to={`/recipes/${recipe.id}`} className="recipe-card-media">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} loading="lazy" />
        ) : (
          <span className="recipe-placeholder" aria-hidden="true">
            {emoji}
          </span>
        )}
      </Link>
      <div className="recipe-card-body">
        <Link to={`/recipes/${recipe.id}`} className="recipe-card-title">
          {recipe.title}
        </Link>
        <p className="recipe-card-meta">
          {recipe.cuisine ? <span className="badge">{recipe.cuisine}</span> : null}
          {recipe.category ? <span className="badge badge-soft">{recipe.category}</span> : null}
          {recipe.prepMinutes + recipe.cookMinutes > 0 ? (
            <span className="muted small"> ⏱ {recipe.prepMinutes + recipe.cookMinutes} min</span>
          ) : null}
        </p>
        {action ? <div className="recipe-card-action">{action}</div> : null}
      </div>
    </div>
  );
}
