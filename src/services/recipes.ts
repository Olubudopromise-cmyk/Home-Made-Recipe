import { supabase } from '../lib/supabase';
import type { Recipe, SavedRecipe } from '../types';

const RECIPE_SELECT = '*, ingredients:recipe_ingredients(position,amount,unit,name)';

interface IngredientRow {
  position?: number | null;
  amount?: number | string | null;
  unit?: string | null;
  name?: string | null;
}

/** PostgREST returns to-one embeds as an object; the TS types say array. */
function firstOf<T>(value: T[] | T | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

interface RecipeRow {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  cuisine?: string | null;
  category?: string | null;
  tags?: string[] | null;
  servings?: number | null;
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  difficulty?: string | null;
  instructions?: string[] | null;
  created_by?: string | null;
  created_at?: string | null;
  ingredients?: IngredientRow[] | null;
}

function toRecipe(row: RecipeRow): Recipe {
  const ingredients = [...(row.ingredients ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((ing) => ({
      amount: ing.amount == null ? null : Number(ing.amount),
      unit: ing.unit ?? '',
      name: ing.name ?? '',
    }));
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    cuisine: row.cuisine ?? '',
    category: row.category ?? '',
    tags: row.tags ?? [],
    servings: row.servings ?? 4,
    prepMinutes: row.prep_minutes ?? 0,
    cookMinutes: row.cook_minutes ?? 0,
    difficulty: row.difficulty ?? '',
    ingredients,
    instructions: row.instructions ?? [],
    imageUrl: row.image_url ?? '',
    authorId: row.created_by ?? '',
    createdAt: row.created_at ?? null,
  };
}

export async function listRecipes(max = 200): Promise<Recipe[]> {
  const { data, error } = await supabase()
    .from('recipes')
    .select(RECIPE_SELECT)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).map((row) => toRecipe(row as RecipeRow));
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase()
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toRecipe(data as RecipeRow) : null;
}

export async function listRecipesByAuthor(uid: string, max = 50): Promise<Recipe[]> {
  const { data, error } = await supabase()
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('created_by', uid)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).map((row) => toRecipe(row as RecipeRow));
}

/** Real count of unique users who marked "I Cooked This". */
export async function countCooks(recipeId: string): Promise<number> {
  const { count, error } = await supabase()
    .from('cooked_recipes')
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', recipeId);
  if (error) throw error;
  return count ?? 0;
}

export async function hasCooked(recipeId: string, uid: string): Promise<boolean> {
  const { data, error } = await supabase()
    .from('cooked_recipes')
    .select('recipe_id')
    .eq('recipe_id', recipeId)
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** Marks (or unmarks) "I Cooked This" — one row per user+recipe in PostgreSQL. */
export async function setCooked(recipe: Recipe, uid: string, cooked: boolean): Promise<void> {
  const client = supabase();
  if (cooked) {
    const { error } = await client
      .from('cooked_recipes')
      .upsert(
        { user_id: uid, recipe_id: recipe.id },
        { onConflict: 'user_id,recipe_id', ignoreDuplicates: true },
      );
    if (error) throw error;
  } else {
    const { error } = await client
      .from('cooked_recipes')
      .delete()
      .eq('user_id', uid)
      .eq('recipe_id', recipe.id);
    if (error) throw error;
  }
}

export async function listCookedHistory(
  uid: string,
): Promise<Array<{ recipeId: string; title: string; imageUrl: string }>> {
  const { data, error } = await supabase()
    .from('cooked_recipes')
    .select('recipe_id,cooked_at,recipe:recipes(id,title,image_url)')
    .eq('user_id', uid)
    .order('cooked_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const recipe = firstOf(row.recipe) as { id: string; title: string; image_url: string } | null;
    if (!recipe) return [];
    return [
      {
        recipeId: recipe.id,
        title: recipe.title ?? 'Recipe',
        imageUrl: recipe.image_url ?? '',
      },
    ];
  });
}

// ---------- Saved recipes (owner-only, enforced by RLS) ----------

export async function setSaved(recipe: Recipe, uid: string, saved: boolean): Promise<void> {
  const client = supabase();
  if (saved) {
    const { error } = await client
      .from('saved_recipes')
      .upsert(
        { user_id: uid, recipe_id: recipe.id },
        { onConflict: 'user_id,recipe_id', ignoreDuplicates: true },
      );
    if (error) throw error;
  } else {
    const { error } = await client
      .from('saved_recipes')
      .delete()
      .eq('user_id', uid)
      .eq('recipe_id', recipe.id);
    if (error) throw error;
  }
}

export async function isSaved(recipeId: string, uid: string): Promise<boolean> {
  const { data, error } = await supabase()
    .from('saved_recipes')
    .select('recipe_id')
    .eq('user_id', uid)
    .eq('recipe_id', recipeId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function listSavedRecipes(uid: string): Promise<SavedRecipe[]> {
  const { data, error } = await supabase()
    .from('saved_recipes')
    .select('recipe_id,created_at,recipe:recipes(id,title,image_url,cuisine,category)')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const recipe = firstOf(row.recipe) as {
      id: string;
      title: string;
      image_url: string;
      cuisine: string;
      category: string;
    } | null;
    if (!recipe) return [];
    return [
      {
        recipeId: recipe.id,
        title: recipe.title,
        imageUrl: recipe.image_url ?? '',
        cuisine: recipe.cuisine ?? '',
        category: recipe.category ?? '',
        savedAt: row.created_at ?? null,
      },
    ];
  });
}
