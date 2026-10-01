-- ============================================================================
-- Home Made Recipe — Supabase PostgreSQL schema + Row Level Security
-- Run this whole file in the Supabase SQL editor (or `supabase db push`).
-- No Firebase anywhere. Every user-owned table is protected by RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- Public profile. Never stores email, phone, or anything auth-private.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Home Cook' check (char_length(display_name) between 1 and 60),
  bio         text not null default '' check (char_length(bio) <= 240),
  photo_url   text not null default '',
  location    text not null default '' check (char_length(location) <= 80),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  created_by    uuid references public.profiles (id) on delete set null,
  title         text not null check (char_length(title) between 1 and 140),
  description   text not null default '',
  image_url     text not null default '',
  cuisine       text not null default '',
  category      text not null default '',
  tags          text[] not null default '{}',
  servings      int  not null default 4 check (servings > 0),
  prep_minutes  int  not null default 0 check (prep_minutes >= 0),
  cook_minutes  int  not null default 0 check (cook_minutes >= 0),
  difficulty    text not null default '' check (difficulty in ('', 'Easy', 'Medium', 'Hard')),
  instructions  text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position  int  not null default 0,
  amount    numeric,
  unit      text not null default '',
  name      text not null
);

-- PRIVATE to one user: saved recipes.
create table if not exists public.saved_recipes (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- PRIVATE to one user: shopping list.
create table if not exists public.shopping_list_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 200),
  amount       numeric,
  unit         text not null default '',
  recipe_id    uuid references public.recipes (id) on delete set null,
  recipe_title text not null default '',
  checked      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- PRIVATE to one user: meal plan (breakfast / lunch / dinner per day).
create table if not exists public.meal_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  recipe_id    uuid references public.recipes (id) on delete set null,
  recipe_title text not null default '',
  plan_date    date not null,
  meal         text not null default 'dinner' check (meal in ('breakfast', 'lunch', 'dinner')),
  servings     int  not null default 2 check (servings > 0),
  created_at   timestamptz not null default now()
);

-- "I Cooked This" — one row per user+recipe. Public read so cook counts are real.
create table if not exists public.cooked_recipes (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  cooked_at  timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  image_url  text not null default '',
  recipe_id  uuid references public.recipes (id) on delete set null,
  topic      text not null default 'food' check (topic in ('food', 'lifestyle')),
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  caption    text not null default '' check (char_length(caption) <= 500),
  video_url  text not null check (video_url ~ '^https?://'),
  image_url  text not null default '',
  recipe_id  uuid references public.recipes (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Likes for posts AND videos (exactly one target per row, FK-cascaded).
create table if not exists public.likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts (id) on delete cascade,
  video_id   uuid references public.videos (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, video_id) = 1)
);

-- Comments for posts AND videos (exactly one target per row, FK-cascaded).
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts (id) on delete cascade,
  video_id   uuid references public.videos (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, video_id) = 1)
);

-- Follow graph. PK prevents duplicates; CHECK prevents self-follows.
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES for common queries
-- ----------------------------------------------------------------------------

create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);
create index if not exists recipes_created_at_idx        on public.recipes (created_at desc);
create index if not exists recipes_created_by_idx        on public.recipes (created_by);
create index if not exists recipes_cuisine_idx           on public.recipes (cuisine);
create index if not exists recipes_category_idx          on public.recipes (category);
create index if not exists posts_created_at_idx          on public.posts (created_at desc);
create index if not exists posts_author_idx              on public.posts (author_id, created_at desc);
create index if not exists posts_topic_idx               on public.posts (topic, created_at desc);
create index if not exists videos_created_at_idx         on public.videos (created_at desc);
create index if not exists videos_author_idx             on public.videos (author_id, created_at desc);
create unique index if not exists likes_post_unique      on public.likes (post_id, user_id) where post_id is not null;
create unique index if not exists likes_video_unique     on public.likes (video_id, user_id) where video_id is not null;
create index if not exists likes_post_idx                on public.likes (post_id);
create index if not exists likes_video_idx               on public.likes (video_id);
create index if not exists likes_user_idx                on public.likes (user_id);
create index if not exists comments_post_idx             on public.comments (post_id, created_at);
create index if not exists comments_video_idx            on public.comments (video_id, created_at);
create index if not exists follows_follower_idx          on public.follows (follower_id);
create index if not exists follows_following_idx         on public.follows (following_id);
create index if not exists saved_recipes_user_idx        on public.saved_recipes (user_id, created_at desc);
create index if not exists shopping_user_idx             on public.shopping_list_items (user_id, created_at);
create index if not exists meal_plans_user_date_idx      on public.meal_plans (user_id, plan_date);
create index if not exists cooked_recipe_idx             on public.cooked_recipes (recipe_id);
create index if not exists cooked_user_idx               on public.cooked_recipes (user_id, cooked_at desc);

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS
-- ----------------------------------------------------------------------------

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists recipes_updated_at on public.recipes;
create trigger recipes_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

-- Auto-create a public profile whenever an auth user is created.
-- Uses display metadata only — never email or phone.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '');
  meta_pic  text := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '');
begin
  insert into public.profiles (id, display_name, photo_url)
  values (
    new.id,
    case when length(trim(meta_name)) > 0 then left(trim(meta_name), 60) else 'Home Cook' end,
    case when meta_pic ~ '^https?://' then meta_pic else '' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.recipes            enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.saved_recipes      enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.meal_plans         enable row level security;
alter table public.cooked_recipes     enable row level security;
alter table public.posts              enable row level security;
alter table public.videos             enable row level security;
alter table public.likes              enable row level security;
alter table public.comments           enable row level security;
alter table public.follows            enable row level security;

-- profiles: public read, owner-only write, no private data stored here
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete using (id = auth.uid());

-- recipes: world-readable discovery; only the creator may change their own
drop policy if exists recipes_select on public.recipes;
create policy recipes_select on public.recipes for select using (true);

drop policy if exists recipes_insert on public.recipes;
create policy recipes_insert on public.recipes for insert
  with check (created_by = auth.uid());

drop policy if exists recipes_update on public.recipes;
create policy recipes_update on public.recipes for update
  using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists recipes_delete on public.recipes;
create policy recipes_delete on public.recipes for delete using (created_by = auth.uid());

-- recipe_ingredients: readable with the recipe, writable only by the recipe owner
drop policy if exists recipe_ingredients_select on public.recipe_ingredients;
create policy recipe_ingredients_select on public.recipe_ingredients for select using (true);

drop policy if exists recipe_ingredients_insert on public.recipe_ingredients;
create policy recipe_ingredients_insert on public.recipe_ingredients for insert
  with check (exists (
    select 1 from public.recipes r where r.id = recipe_id and r.created_by = auth.uid()
  ));

drop policy if exists recipe_ingredients_update on public.recipe_ingredients;
create policy recipe_ingredients_update on public.recipe_ingredients for update
  using (exists (
    select 1 from public.recipes r where r.id = recipe_id and r.created_by = auth.uid()
  ));

drop policy if exists recipe_ingredients_delete on public.recipe_ingredients;
create policy recipe_ingredients_delete on public.recipe_ingredients for delete
  using (exists (
    select 1 from public.recipes r where r.id = recipe_id and r.created_by = auth.uid()
  ));

-- saved_recipes: strictly owner-only (no public read)
drop policy if exists saved_recipes_all on public.saved_recipes;
create policy saved_recipes_all on public.saved_recipes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- shopping_list_items: strictly owner-only
drop policy if exists shopping_all on public.shopping_list_items;
create policy shopping_all on public.shopping_list_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- meal_plans: strictly owner-only
drop policy if exists meal_plans_all on public.meal_plans;
create policy meal_plans_all on public.meal_plans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- cooked_recipes: real public cook counts, but only you can add/remove your mark
drop policy if exists cooked_select on public.cooked_recipes;
create policy cooked_select on public.cooked_recipes for select using (true);

drop policy if exists cooked_insert on public.cooked_recipes;
create policy cooked_insert on public.cooked_recipes for insert
  with check (user_id = auth.uid());

drop policy if exists cooked_delete on public.cooked_recipes;
create policy cooked_delete on public.cooked_recipes for delete using (user_id = auth.uid());

-- posts: public read, authenticated authors write their own only
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select using (true);

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert
  with check (author_id = auth.uid());

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete using (author_id = auth.uid());

-- videos: same model as posts
drop policy if exists videos_select on public.videos;
create policy videos_select on public.videos for select using (true);

drop policy if exists videos_insert on public.videos;
create policy videos_insert on public.videos for insert
  with check (author_id = auth.uid());

drop policy if exists videos_update on public.videos;
create policy videos_update on public.videos for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists videos_delete on public.videos;
create policy videos_delete on public.videos for delete using (author_id = auth.uid());

-- likes: public counts, only your own like, never faked
drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes for select using (true);

drop policy if exists likes_insert on public.likes;
create policy likes_insert on public.likes for insert
  with check (user_id = auth.uid());

drop policy if exists likes_delete on public.likes;
create policy likes_delete on public.likes for delete using (user_id = auth.uid());

-- comments: public read; write as yourself; delete your own or moderation on your content
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select using (true);

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert
  with check (author_id = auth.uid());

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete using (
  author_id = auth.uid()
  or exists (select 1 from public.posts  p where p.id = post_id  and p.author_id = auth.uid())
  or exists (select 1 from public.videos v where v.id = video_id and v.author_id = auth.uid())
);

-- follows: public graph (counts are real), but you only ever write your own edge
drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows for select using (true);

drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows for insert
  with check (follower_id = auth.uid() and follower_id <> following_id);

drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows for delete using (follower_id = auth.uid());
