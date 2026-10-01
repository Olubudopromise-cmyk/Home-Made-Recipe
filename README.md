# Home Made Recipe

A food-focused social platform where people **discover recipes, learn to cook, share food and
lifestyle posts, watch short cooking videos, and follow other food lovers and creators**.

Core loop: **Discover → Learn → Cook → Share → Watch → Follow → Discover more.**
Positioning: **Nigerian-rooted, globally open.**

Built as a **React + Vite + TypeScript** single-page app on **Supabase** (Auth, PostgreSQL with
Row Level Security, optional Storage) and deployable to **Vercel**.

> **No Firebase anywhere.** No Firebase Auth, Firestore, Storage, Hosting, Functions or SDK.
> You create and connect the Supabase and Vercel projects yourself; this repo never deploys
> itself and never contains secrets.

---

## What is implemented (all real, no fake data)

| Area | Features |
| --- | --- |
| **Accounts** | Google sign-in, phone-number OTP (once an SMS provider is configured), email/password fallback. Supabase Auth is the only identity source — never localStorage. |
| **Profiles** | display name, photo (URL), bio, location; edit only your own (enforced by RLS). Public profiles with real posts/videos/followers/following. |
| **Recipes** | browse, search, cuisine/category chips (Nigerian first), ingredients, instructions, **servings adjuster** (amounts scale), save recipes, **shopping list**, **meal plan** (breakfast/lunch/dinner), **I Cooked This**. |
| **Social feed** | short posts with optional photo URL and optional recipe reference, likes, comments, follow/unfollow, followers/following lists, a **Following feed**. |
| **Videos** | vertical short-video feed (autoplay only what's on screen), post videos by direct URL, like, comment, follow creator, connect a video to a recipe, delete your own. |
| **Lifestyle** | separate food-lifestyle feed (restaurants, travel, kitchen life) — same real post system, topic `lifestyle`. |
| **Kitchen (private)** | saved recipes, cooking history, shopping list (check off / clear), meal plan (by date + slot) — readable/writable **only by the owner**, enforced by RLS. |

**Honest numbers:** follower/following counts, like counts and comment counts are computed live
with `COUNT` by PostgreSQL; "cooked" counts come from `cooked_recipes` rows. Nothing is a
stored or fabricated counter.

### Explicitly NOT built (per brief)

Premium, payments, live streaming, paid courses, monetization, ads, restaurant ordering,
recommendation algorithms, analytics dashboards, notifications. Those show as *Coming Soon* or
are simply not exposed.

---

## Project structure

```
supabase/
  schema.sql         All tables, indexes, constraints, triggers + RLS policies
  seed.sql           Idempotent starter recipes (Nigerian + international)
src/
  lib/               supabase client (config check, count helper), formatting helpers
  context/           AuthContext (Supabase session + public profile)
  services/          posts, videos, comments, likes, follows, recipes, kitchen, users
  hooks/             useProfiles (cached), useLikes
  components/        Layout, PostCard, VideoCard, Composer, CommentThread,
                     FollowButton, RecipeCard, KitchenPanel, Avatar, Spinner, EmptyState
  pages/             Home, Recipes, RecipeDetail, Videos, Lifestyle,
                     Following, Profile, EditProfile, PostDetail, Login
  types.ts           Shared domain types
  styles.css         All styling (mobile-first)
vercel.json          SPA rewrite (all routes → index.html)
.env.example         Env var placeholders (no secrets)
```

Every Supabase access goes through `src/services/*` — components never talk to the client
directly.

---

## Database schema (PostgreSQL / Supabase)

Full SQL: [`supabase/schema.sql`](supabase/schema.sql).

```
profiles          id (→ auth.users), display_name, bio, photo_url, location, timestamps
recipes           id, created_by (nullable platform seed), title, description, image_url,
                  cuisine, category, tags[], servings, prep/cook minutes, difficulty,
                  instructions[], timestamps
recipe_ingredients recipe_id, position, amount, unit, name   (scales with servings)
saved_recipes     (user_id, recipe_id) PK — owner-only
shopping_list_items user_id, name, amount, unit, recipe ref, checked — owner-only
meal_plans        user_id, recipe ref, plan_date, meal (breakfast|lunch|dinner), servings — owner-only
cooked_recipes    (user_id, recipe_id) PK — public read for real cook counts, owner writes
posts             author_id, body, image_url, recipe ref, topic (food|lifestyle), created_at
videos            author_id, caption, video_url, image_url (poster), recipe ref, created_at
likes             post_id XOR video_id, user_id  (+ unique partial indexes per target)
comments          post_id XOR video_id, author_id, body
follows           (follower_id, following_id) PK + CHECK follower <> following
```

Constraints do the enforcing: UUID PKs, FKs with `ON DELETE CASCADE`, unique partial indexes
for likes, primary keys for follows/saved/cooked (no duplicates possible), `CHECK` blocks
self-follows, `CHECK (num_nonnulls(post_id, video_id) = 1)` keeps every like/comment on exactly
one target. Indexes cover the feeds (`created_at desc`), author feeds, topic feeds, follow
lookups and kitchen lists.

A `handle_new_user` trigger creates the public profile row on signup from display metadata
**only** — never email or phone.

---

## Row Level Security

RLS is enabled on **every** table; the policies live in `supabase/schema.sql`. Summary:

| Table | Read | Write |
| --- | --- | --- |
| `profiles` | anyone | owner only (`id = auth.uid()`) |
| `recipes`, `recipe_ingredients` | anyone | recipe creator only |
| `posts`, `videos` | anyone | author only |
| `likes`, `comments`, `follows` | anyone (counts are real) | only your own row (`auth.uid()`); comments also deletable by the content owner |
| `cooked_recipes` | anyone (real cook counts) | your own mark only |
| `saved_recipes`, `shopping_list_items`, `meal_plans` | **owner only** | **owner only** |

A signed-out visitor can read public content and nothing else; user B editing/reading user A's
private rows fails at the database with `permission-denied`-style errors, regardless of what
the frontend does.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com) (you do this — no keys are requested
   by this repo).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
   (Tables, indexes, triggers and every RLS policy are created.)
3. **SQL Editor → New query** → paste all of `supabase/seed.sql` → **Run**
   (optional but recommended — 14 real starter recipes).
4. **Settings → API** → copy the *Project URL* and *anon / public key*.
5. Copy `.env.example` → `.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   The anon key is public-by-design and safe in the browser bundle — RLS is the guardrail.
   **Never** put the `service_role` key in this app or in any `VITE_` variable.

### 3. Supabase Auth configuration

Dashboard → **Authentication → Providers / Sign In**:

- **Email/password**: enable (fallback method). For a smoother demo, you can disable
  "Confirm email" so sign-up logs in immediately; leave it on for production.
- **Google**:
  1. In Google Cloud Console create an OAuth 2.0 Client ID (Web application) with
     redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
  2. Paste the Client ID + Secret into Supabase → Auth → Providers → **Google** → enable.
  3. Dashboard → Auth → URL Configuration → add your site URL
     (`http://localhost:5173` for dev, `https://<your-app>.vercel.app` for production)
     and redirect URLs.
- **Phone** (only if you want SMS):
  1. Dashboard → Auth → Providers → **Phone** → enable.
  2. Connect an SMS provider (Twilio, Vonage, MessageBird…) with its credentials —
     those secrets live in Supabase, never in this repo.
  3. Until a provider is configured, the phone form shows an honest "not configured" error
     instead of pretending to work. That is by design.

**Authorized domains:** Dashboard → Authentication → Settings → Authorized domains must include
`localhost` and your Vercel domain, or OAuth/OTP redirects will be rejected.

### 4. Storage (optional, modular)

The MVP shares media by URL (profile photos, post images, recipe images, video files), so
Storage is **not required**. If you enable it later: Dashboard → Storage → create a bucket
(e.g. `media`), keep the default private/public policy decisions in the dashboard, and upload
from the client — no code changes are needed for URL-based media to keep working.

---

## npm commands

```bash
npm run dev        # dev server → http://localhost:5173
npm run build      # typecheck + production build → dist/
npm run typecheck  # tsc --noEmit only
npm run preview    # serve the production build locally
```

The production build must succeed before shipping — `npm run build` runs `tsc --noEmit` first
and fails on any type error.

---

## Vercel deployment (you deploy — this repo never deploys itself)

1. Push the repository to GitHub and import it in Vercel (or run `vercel` locally).
2. Framework preset: **Vite**. Vercel auto-detects it. Explicit settings if asked:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
3. Environment variables (Project → Settings → Environment Variables):

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon/public key |

4. `vercel.json` is already in the repo — it rewrites every path to `/index.html` so
   `/recipes/:id`, `/u/:uid` etc. work on refresh.
5. Deploy, then add the `*.vercel.app` domain to Supabase → Auth → Authorized domains and URL
   configuration.

---

## Testing

Two users + a signed-out visitor, all repeatable: see **[TESTING.md](TESTING.md)** for the full
checklist (profile ownership, private kitchen data, follows, RLS denials, persistence,
refresh/login restores).

---

## Known limitations

- **URL-based media:** photos, avatars and videos are direct `https://` links; no file uploads
  yet (Storage is optional and modular — see above).
- **Phone auth needs an SMS provider** configured in Supabase; without one the UI says so
  honestly instead of faking availability.
- **Google/Email providers** need the one-time dashboard configuration described above.
- **Search** is client-side over the recipe list (fine at seed scale; move to a search service
  when the catalog grows).
- **Feeds** load the latest 50 posts / 8 videos per page — no algorithmic ranking (by design).
- **No notifications, no DMs, no premium/live** — out of MVP scope on purpose.
- Everything stays food/cooking/lifestyle focused — the feed is a food community, not a general
  social network.
