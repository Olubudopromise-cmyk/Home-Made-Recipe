# Testing checklist — Home Made Recipe

Repeatable verification with **User A**, **User B**, and a **signed-out visitor**.
Run against your Supabase project after `schema.sql` (+ optional `seed.sql`) is applied.

Preparation:

1. `npm install && npm run dev`
2. Open two browsers (or one normal + one private window) so sessions don't overlap.
3. Browser 1 = **User A**, browser 2 = **User B**, browser 3 (or curl) = **signed-out**.

---

## 1. Accounts & profiles

- [ ] A signs up (email/password, or Google if configured) → lands in the app with a profile
- [ ] B signs up independently
- [ ] A edits A's profile (name, bio, location, photo URL) → changes persist after refresh
- [ ] B opens A's profile → sees A's public fields, **no email, no phone anywhere**
- [ ] B tries to open `/u/<A-id>/edit` directly → redirected to A's profile (UI guard)
- [ ] B **cannot** edit A's profile at the database level (see REST probe below)
- [ ] Signed-out visitor sees public profiles but has no Edit button anywhere

## 2. Private kitchen data (RLS)

As A: open a recipe → **Save recipe**, **Add ingredients** (shopping list), **Add to meal plan**.

- [ ] A sees the saved recipe / shopping items / meal plan under **My Kitchen**
- [ ] B opens A's profile → **My Kitchen tab is absent** (only the owner gets it)
- [ ] B **cannot read** A's saved recipes / shopping list / meal plan at the database level
      (REST probe below returns zero rows)
- [ ] Signed-out visitor cannot read A's private rows either
- [ ] A's shopping list check-off, clear-checked, and meal-plan removal all persist after refresh

## 3. Follow system

- [ ] A follows B → button flips to **Following**, B's follower count +1 (real data)
- [ ] B sees A in their followers list; B's **Following feed** now shows A's posts
- [ ] A unfollows B → counts return to previous values
- [ ] Nobody can follow themselves (button hides on own profile; DB CHECK blocks it anyway)
- [ ] Double-clicking Follow never creates duplicate rows (primary key)

## 4. Posts, likes, comments (persistence)

- [ ] A creates a food post (text + optional photo + optional recipe) → appears at top of Home
- [ ] A creates a lifestyle post → appears under Lifestyle only
- [ ] B likes A's post → count +1; refresh → still +1 (row in `likes`)
- [ ] B comments on A's post → comment persists after refresh and after B logs out/in
- [ ] A (content owner) can delete B's comment on A's post; B can delete B's own comment
- [ ] A deletes A's own post → gone for everyone; its likes/comments disappear (cascade)
- [ ] B has no Delete button on A's post, and a forced delete fails at the DB (probe below)
- [ ] Signed-out visitor can read public posts but cannot post/like/comment (UI hides it;
      DB rejects it — probe below)

## 5. Videos

- [ ] A posts a video (direct `.mp4`/`.webm` URL + caption, optional poster + recipe link)
- [ ] Video plays in the feed; only the on-screen video autoplays
- [ ] B likes/comments on A's video → persist after refresh
- [ ] A can delete A's video; B cannot (no button; DB rejects a forced delete)

## 6. Recipes

- [ ] Recipe list shows the seeded Nigerian-first catalog (Jollof, Egusi, Pounded Yam, Suya,
      Moi Moi, Pepper Soup, Afang, Ofada, Fried Rice, Puff-Puff + international dishes)
- [ ] Search + cuisine/category chips filter correctly
- [ ] Servings stepper rescales ingredient amounts correctly (e.g. 6 → 3 halves every amount)
- [ ] **I Cooked This** marks/unmarks and the cook count moves by exactly ±1
- [ ] Cooked marks + saved recipes survive logout/login (they belong to the user, not the device)

## 7. Session integrity

- [ ] Logout → protected actions disappear; login again → same user's data returns
- [ ] Full page refresh (F5) on Home, a recipe, a profile and the videos feed → nothing lost
- [ ] Deep link refresh works: `/recipes/<id>`, `/u/<id>`, `/posts/<id>` all render
      (Vercel SPA rewrite in `vercel.json`)
- [ ] A logged-out tab never shows A's private kitchen data

---

## REST probes (prove RLS, not just the UI)

These use only the **public anon key** — no service-role key, safe to run anywhere.

```bash
URL="https://<project-ref>.supabase.co"
ANON="<your anon key>"

# 1) Signed-out visitor tries to INSERT a post → must be rejected (401/403 or RLS error)
curl -s -X POST "$URL/rest/v1/posts" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"author_id":"00000000-0000-0000-0000-000000000000","body":"hacked"}'
# Expected: error — no JWT / row-level security violation. No row created.

# 2) Signed-out visitor tries to READ A's shopping list → must return zero rows
curl -s "$URL/rest/v1/shopping_list_items?select=*" \
  -H "apikey: $ANON"   # → []

# 3) Signed-out visitor tries to UPDATE A's profile → must change nothing
curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.<A-uid>" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"bio":"hacked"}'
# Expected: [] — zero rows updated.
```

**Proving it as User B** (still no service-role key): sign B in, open DevTools →
Application → Local Storage → find the `sb-<ref>-auth-token` entry → copy its `access_token`,
then add `-H "Authorization: Bearer <B-token>"` to the probes above targeting **A's** data:

- reading `shopping_list_items?user_id=eq.<A-uid>` → `[]` (private rows invisible to B)
- `PATCH profiles?id=eq.<A-uid>` → `[]` (B cannot edit A)
- `DELETE posts?id=eq.<A-post>` → `[]` (B cannot delete A's post)

A non-empty result on any of these means RLS is wrong — re-run `supabase/schema.sql`.

---

## Sign-in method checks

- [ ] Email/password sign-up + sign-in works
- [ ] Google works once the provider + redirect URLs are configured
- [ ] Phone shows an honest "not configured" error until an SMS provider is connected —
      and works end-to-end (code → session) once it is
- [ ] Auth errors surface as readable messages (wrong password, expired code, rate limits)
