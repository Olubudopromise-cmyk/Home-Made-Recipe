import { supabase } from '../lib/supabase';
import type { MealPlanEntry, Recipe, ShoppingItem } from '../types';

// ---------- Shopping list (owner-only via RLS) ----------

interface ShoppingRow {
  id: string;
  name: string;
  amount?: number | string | null;
  unit?: string | null;
  recipe_id?: string | null;
  recipe_title?: string | null;
  checked?: boolean | null;
  created_at?: string | null;
}

function toItem(row: ShoppingRow): ShoppingItem {
  return {
    id: row.id,
    name: row.name ?? '',
    amount: row.amount == null ? null : Number(row.amount),
    unit: row.unit ?? '',
    recipeId: row.recipe_id ?? '',
    recipeTitle: row.recipe_title ?? '',
    checked: Boolean(row.checked),
    createdAt: row.created_at ?? null,
  };
}

/** Adds every ingredient of a recipe to the owner's shopping list in one insert. */
export async function addIngredientsToShoppingList(
  uid: string,
  recipe: Recipe,
): Promise<number> {
  if (recipe.ingredients.length === 0) return 0;
  const rows = recipe.ingredients.map((ingredient) => ({
    user_id: uid,
    name: (ingredient.name || ingredient.unit || 'ingredient').slice(0, 200),
    amount: ingredient.amount,
    unit: ingredient.unit,
    recipe_id: recipe.id,
    recipe_title: recipe.title,
    checked: false,
  }));
  const { error } = await supabase().from('shopping_list_items').insert(rows);
  if (error) throw error;
  return recipe.ingredients.length;
}

export async function listShoppingList(uid: string): Promise<ShoppingItem[]> {
  const { data, error } = await supabase()
    .from('shopping_list_items')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []).map((row) => toItem(row as ShoppingRow));
}

export async function setShoppingItemChecked(
  uid: string,
  item: ShoppingItem,
  checked: boolean,
): Promise<void> {
  const { error } = await supabase()
    .from('shopping_list_items')
    .update({ checked })
    .eq('id', item.id)
    .eq('user_id', uid);
  if (error) throw error;
}

export async function removeShoppingItem(uid: string, itemId: string): Promise<void> {
  const { data, error } = await supabase()
    .from('shopping_list_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', uid)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('That item is no longer on your list.');
  }
}

// ---------- Meal plan (owner-only via RLS) ----------

interface MealPlanRow {
  id: string;
  recipe_id?: string | null;
  recipe_title?: string | null;
  plan_date?: string | null;
  meal?: string | null;
  servings?: number | null;
  created_at?: string | null;
}

function toEntry(row: MealPlanRow): MealPlanEntry {
  const meal = row.meal === 'breakfast' || row.meal === 'lunch' ? row.meal : 'dinner';
  return {
    id: row.id,
    recipeId: row.recipe_id ?? '',
    recipeTitle: row.recipe_title ?? '',
    date: String(row.plan_date ?? ''),
    meal,
    servings: Number(row.servings ?? 1),
    createdAt: row.created_at ?? null,
  };
}

export async function addMealPlanEntry(
  uid: string,
  input: {
    recipeId: string;
    recipeTitle: string;
    date: string;
    servings: number;
    meal: 'breakfast' | 'lunch' | 'dinner';
  },
): Promise<void> {
  const { error } = await supabase().from('meal_plans').insert({
    user_id: uid,
    recipe_id: input.recipeId || null,
    recipe_title: input.recipeTitle,
    plan_date: input.date,
    meal: input.meal,
    servings: input.servings,
  });
  if (error) throw error;
}

export async function listMealPlan(uid: string): Promise<MealPlanEntry[]> {
  const { data, error } = await supabase()
    .from('meal_plans')
    .select('*')
    .eq('user_id', uid)
    .order('plan_date', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => toEntry(row as MealPlanRow));
}

export async function removeMealPlanEntry(uid: string, entryId: string): Promise<void> {
  const { data, error } = await supabase()
    .from('meal_plans')
    .delete()
    .eq('id', entryId)
    .eq('user_id', uid)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('That meal plan entry no longer exists.');
  }
}

// ---------- Shared ----------

export async function clearCheckedShoppingItems(uid: string): Promise<number> {
  const { data, error } = await supabase()
    .from('shopping_list_items')
    .delete()
    .eq('user_id', uid)
    .eq('checked', true)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}
