export type Topic = 'food' | 'lifestyle';
export type ContentKind = 'post' | 'video';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

/**
 * Public profile row: public.profiles. Never contains email, phone, or any
 * other auth-private data — email lives only in Supabase Auth.
 * `createdAt` is an ISO string from timestamptz.
 */
export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  location: string;
  createdAt: string | null;
}

export interface Ingredient {
  /** null = "to taste" items with no numeric amount. */
  amount: number | null;
  unit: string;
  name: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  category: string;
  tags: string[];
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  /** '', 'Easy', 'Medium', 'Hard'. */
  difficulty: string;
  ingredients: Ingredient[];
  instructions: string[];
  imageUrl: string;
  authorId: string;
  createdAt: string | null;
}

export interface SavedRecipe {
  recipeId: string;
  title: string;
  imageUrl: string;
  cuisine: string;
  category: string;
  savedAt: string | null;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  recipeId: string;
  recipeTitle: string;
  checked: boolean;
  createdAt: string | null;
}

export interface MealPlanEntry {
  id: string;
  recipeId: string;
  recipeTitle: string;
  date: string; // YYYY-MM-DD
  meal: MealSlot;
  servings: number;
  createdAt: string | null;
}

export interface Post {
  id: string;
  authorId: string;
  text: string;
  imageUrl: string;
  recipeId: string;
  recipeTitle: string;
  topic: Topic;
  likeCount: number;
  commentCount: number;
  createdAt: string | null;
}

export interface VideoPost {
  id: string;
  authorId: string;
  caption: string;
  videoUrl: string;
  /** Optional direct image URL used as the <video> poster. */
  imageUrl: string;
  recipeId: string;
  recipeTitle: string;
  likeCount: number;
  commentCount: number;
  createdAt: string | null;
}

export interface CommentDoc {
  id: string;
  authorId: string;
  text: string;
  createdAt: string | null;
}
