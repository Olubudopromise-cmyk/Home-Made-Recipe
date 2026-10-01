-- ============================================================================
-- Home Made Recipe — starter recipe seed (Nigerian-first + international).
-- Idempotent: safe to run more than once (existing rows are skipped).
--
-- Run in the Supabase SQL editor AFTER schema.sql.
-- Seeded recipes are ordinary rows created by the platform account
-- (created_by is NULL), so they are publicly readable but not editable
-- from the app — only from this SQL editor.
-- ============================================================================

-- 1. Nigerian Jollof Rice -----------------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:jollof-rice')::uuid, 'Nigerian Jollof Rice',
  'The party rice of Nigeria — smoky, spicy and cooked in one pot with a rich pepper base.',
  'Nigerian', 'Rice & Grains', array['jollof','party rice','one pot','spicy'],
  6, 15, 45, 'Medium',
  array[
    'Blend tomatoes, red bell peppers, scotch bonnet and one onion until smooth, then boil down until the water reduces.',
    'Heat vegetable oil and fry the tomato paste for 3 minutes, then add the blended pepper mix, bay leaf, thyme, curry powder, crumbled bouillon and salt. Fry for 20 minutes, stirring often.',
    'Wash the rice and add it to the sauce. Stir so every grain is coated.',
    'Pour in the chicken stock — the liquid should sit just above the rice. Cover and cook on low heat for 25–30 minutes.',
    'Stir once, taste for salt, then cover with foil and the lid for a final 10 minutes so the bottom catches a little smoke (the beloved “party” flavour).',
    'Rest for 5 minutes before fluffing with a fork. Serve with fried chicken, salad or plantain.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:jollof-rice')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 3, 'cups', 'long grain parboiled rice'),
  (2, 6, '', 'ripe tomatoes'),
  (3, 3, '', 'red bell peppers (tatashe)'),
  (4, 2, '', 'scotch bonnet peppers (ata rodo)'),
  (5, 2, 'medium', 'onions'),
  (6, 0.75, 'cup', 'vegetable oil'),
  (7, 3, 'tablespoons', 'tomato paste'),
  (8, 2, 'teaspoons', 'curry powder'),
  (9, 1, 'teaspoon', 'dried thyme'),
  (10, 2, 'bouillon cubes', 'Maggi or Knorr'),
  (11, 2, 'teaspoons', 'salt'),
  (12, 2, 'cups', 'chicken stock'),
  (13, 1, '', 'bay leaf')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:jollof-rice')::uuid);

-- 2. Egusi Soup ---------------------------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:egusi-soup')::uuid, 'Egusi Soup',
  'A rich Nigerian soup thickened with ground melon seeds, loaded with leafy greens and assorted meat.',
  'Nigerian', 'Soups', array['egusi','melon seeds','soup','leafy greens'],
  6, 20, 50, 'Medium',
  array[
    'Boil the assorted meat with onion, bouillon and salt until tender. Reserve the stock.',
    'Grind crayfish and scotch bonnet. Mix the ground egusi with a little water into a thick paste.',
    'Heat palm oil in a pot, add the remaining sliced onion and fry briefly, then add the meat stock and bring to a simmer.',
    'Drop spoonfuls of the egusi paste into the simmering stock. Cover and let set for 10 minutes without stirring, then stir gently.',
    'Add the cooked meat, stockfish, ground crayfish and extra bouillon. Simmer for 15 minutes.',
    'Stir in the chopped pumpkin leaves and cook for 3–5 minutes more. Serve with pounded yam, fufu or eba.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:egusi-soup')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 2, 'cups', 'ground egusi (melon seeds)'),
  (2, 0.5, 'cup', 'palm oil'),
  (3, 1.5, 'lbs', 'assorted meat (beef, shaki, ponmo)'),
  (4, 1, 'cup', 'ground crayfish'),
  (5, 4, '', 'stockfish pieces (optional)'),
  (6, 2, 'bouillon cubes', 'Maggi or Knorr'),
  (7, 1.5, 'teaspoons', 'salt'),
  (8, 2, '', 'onions'),
  (9, 4, '', 'scotch bonnet peppers'),
  (10, 3, 'cups', 'pumpkin leaves (ugwu) or spinach, chopped'),
  (11, 1, 'cup', 'palm fruit extract (optional, for extra richness)')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:egusi-soup')::uuid);

-- 3. Pounded Yam --------------------------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:pounded-yam')::uuid, 'Pounded Yam',
  'The smooth, stretchy swallow that accompanies Nigerian soups.',
  'Nigerian', 'Swallows', array['swallow','pounded yam','classic'],
  4, 10, 25, 'Easy',
  array[
    'Peel the yam, cut into chunks and rinse.',
    'Boil in water with salt until completely soft — a fork should slide through with no resistance.',
    'Drain, reserving a little cooking water.',
    'Pound in a mortar (or blend in a sturdy food processor, adding splashes of the reserved water) until smooth, white and stretchy.',
    'Shape into balls and serve hot with egusi, efo riro or any soup of your choice.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:pounded-yam')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 4, 'medium', 'yam tubers, peeled and cut'),
  (2, 4, 'cups', 'water'),
  (3, 0.5, 'teaspoon', 'salt')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:pounded-yam')::uuid);

-- 4. Suya (Nigerian Beef Skewers) ---------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:suya')::uuid, 'Suya (Nigerian Beef Skewers)',
  'Smoky, spicy street-style beef skewers dusted with yaji peanut spice.',
  'Nigerian', 'Grills', array['suya','street food','grill','peanut spice'],
  4, 30, 15, 'Medium',
  array[
    'Mix ground peanuts, chilli powder, ginger, garlic powder, paprika, salt and cloves to make yaji spice.',
    'Toss the thin beef slices with oil and 2 tablespoons of the yaji. Thread onto soaked skewers.',
    'Rest for at least 20 minutes so the spice penetrates.',
    'Grill over hot coals or a very hot grill pan for 3–4 minutes per side, until charred at the edges.',
    'Dust generously with the remaining yaji and serve with onion rings, tomato and extra pepper.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:suya')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 2, 'lbs', 'beef sirloin, sliced very thin'),
  (2, 0.25, 'cup', 'ground peanuts (kuli-kuli style, unsweetened)'),
  (3, 1, 'tablespoon', 'chilli powder'),
  (4, 1, 'teaspoon', 'ground ginger'),
  (5, 1, 'teaspoon', 'garlic powder'),
  (6, 1, 'teaspoon', 'smoked paprika'),
  (7, 1, 'teaspoon', 'salt'),
  (8, 0.5, 'teaspoon', 'ground cloves'),
  (9, 3, 'tablespoons', 'vegetable oil'),
  (10, 1, '', 'onion, sliced into rings'),
  (11, 1, '', 'tomato, sliced')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:suya')::uuid);

-- 5. Moi Moi (Steamed Bean Pudding) -------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:moi-moi')::uuid, 'Moi Moi (Steamed Bean Pudding)',
  'A fluffy steamed pudding of peeled beans, rich in protein and flavour.',
  'Nigerian', 'Snacks', array['beans','steamed','protein','party food'],
  6, 25, 60, 'Medium',
  array[
    'If using whole beans, soak and peel them, then blend with a little water until completely smooth.',
    'Stir in the blended pepper mix, onion, oil, bouillon, salt and warm water — the batter should be like thick cream.',
    'Fold in optional egg slices or corned beef.',
    'Pour into greased ramekins, foil cups or a lined baking tin.',
    'Steam (or bake in a water bath) at 180°C / 350°F for 45–60 minutes until set firm in the middle.',
    'Cool for 10 minutes before unmoulding. Great with jollof or on its own.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:moi-moi')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 3, 'cups', 'peeled black-eyed beans (or bean flour)'),
  (2, 0.5, 'cup', 'vegetable oil'),
  (3, 1, 'cup', 'blended pepper mix (bell pepper + scotch bonnet)'),
  (4, 1, 'medium', 'onion, blended'),
  (5, 2, 'bouillon cubes', 'Maggi or Knorr'),
  (6, 1.5, 'teaspoons', 'salt'),
  (7, 1, 'cup', 'warm water or stock'),
  (8, 4, '', 'boiled eggs, sliced (optional)'),
  (9, 0.5, 'cup', 'cooked corned beef or minced meat (optional)')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:moi-moi')::uuid);

-- 6. Catfish Pepper Soup ------------------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:catfish-pepper-soup')::uuid, 'Catfish Pepper Soup',
  'A fiery, aromatic broth with catfish and the classic pepper-soup spice blend.',
  'Nigerian', 'Soups', array['pepper soup','catfish','broth','spicy'],
  4, 15, 25, 'Easy',
  array[
    'Rinse the catfish steaks and season with salt.',
    'Bring water, onion, scotch bonnet, pepper soup spice, crayfish and bouillon to a boil.',
    'Slide in the catfish and simmer gently for 12–15 minutes — do not stir hard or the fish will break.',
    'Taste and adjust salt and heat.',
    'Strew shredded scent leaves over the top, cover for 1 minute and serve hot.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:catfish-pepper-soup')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 1.5, 'lbs', 'catfish, cut into steaks'),
  (2, 1, 'tablespoon', 'ground pepper soup spice (ehuru, uda, uziza blend)'),
  (3, 2, '', 'scotch bonnet peppers, ground'),
  (4, 1, 'bouillon cube', 'Maggi or Knorr'),
  (5, 1, 'teaspoon', 'salt'),
  (6, 1, '', 'onion, sliced'),
  (7, 3, 'cups', 'water'),
  (8, 1, 'tablespoon', 'ground crayfish'),
  (9, 6, 'leaves', 'scent leaves (efirin) or basil, shredded')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:catfish-pepper-soup')::uuid);

-- 7. Afang Soup ---------------------------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:afang-soup')::uuid, 'Afang Soup',
  'A cross-river classic with bitter afang leaves, waterleaf and assorted meat.',
  'Nigerian', 'Soups', array['afang','leafy greens','soup'],
  6, 25, 45, 'Medium',
  array[
    'Boil assorted meat with onion, half the crayfish, bouillon and salt until tender; keep the stock.',
    'In a separate pot, steam the chopped waterleaf for 5 minutes until it releases its liquid.',
    'Add palm oil, ground afang, remaining crayfish, peppers and the meat with stock to the waterleaf.',
    'Simmer together for 15 minutes so the flavours marry.',
    'Add periwinkles if using, simmer 5 more minutes and serve with pounded yam or garri.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:afang-soup')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 2, 'cups', 'ground afang leaves'),
  (2, 4, 'cups', 'waterleaf, chopped'),
  (3, 0.75, 'cup', 'palm oil'),
  (4, 1.5, 'lbs', 'assorted meat'),
  (5, 1, 'cup', 'ground crayfish'),
  (6, 1, 'cup', 'periwinkles (optional, shelled)'),
  (7, 2, 'bouillon cubes', 'Maggi or Knorr'),
  (8, 1.5, 'teaspoons', 'salt'),
  (9, 4, '', 'scotch bonnet peppers'),
  (10, 1, '', 'onion')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:afang-soup')::uuid);

-- 8. Ofada Rice & Ayamase Sauce -----------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:ofada-rice')::uuid, 'Ofada Rice & Ayamase Sauce',
  'Local brown Ofada rice with the famous green fried-pepper ayamase stew.',
  'Nigerian', 'Rice & Grains', array['ofada','ayamase','green pepper sauce'],
  5, 25, 50, 'Hard',
  array[
    'Boil the Ofada rice until tender but still chewy; drain well.',
    'Blend green bell peppers, scotch bonnet and onion — keep it coarse, not smooth.',
    'Heat the palm oil until it loses its raw smell (do not bleach to smoking), then add the blended pepper mix.',
    'Fry on medium heat for 20 minutes, stirring often, until the sauce darkens.',
    'Add iru, bouillon, salt, crayfish, cooked meat and eggs. Simmer 10 minutes.',
    'Serve the sauce over the Ofada rice, traditionally wrapped in a leaf.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:ofada-rice')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 3, 'cups', 'unpolished Ofada rice'),
  (2, 0.5, 'cup', 'bleached palm oil (or vegetable oil)'),
  (3, 6, '', 'green bell peppers (bawa)'),
  (4, 6, '', 'scotch bonnet peppers'),
  (5, 1, '', 'onion, blended'),
  (6, 3, 'tablespoons', 'locust beans (iru)'),
  (7, 1, 'cup', 'assorted meat, cooked'),
  (8, 3, '', 'boiled eggs (optional)'),
  (9, 2, 'bouillon cubes', 'Maggi or Knorr'),
  (10, 1.5, 'teaspoons', 'salt'),
  (11, 2, 'teaspoons', 'dried crayfish')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:ofada-rice')::uuid);

-- 9. Nigerian Fried Rice ------------------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:nigerian-fried-rice')::uuid, 'Nigerian Fried Rice',
  'Colourful party fried rice with vegetables, liver and warming spices.',
  'Nigerian', 'Rice & Grains', array['fried rice','party food','vegetables'],
  6, 15, 30, 'Easy',
  array[
    'Season and cook the chicken liver/turkey, then dice small.',
    'Heat oil and sauté the onions until soft.',
    'Add mixed vegetables and stir-fry for 3 minutes so they stay crisp.',
    'Add the cooked rice, stock, bouillon, curry, thyme and salt. Toss everything together over medium heat for 8–10 minutes.',
    'Fold in the diced meat, taste and adjust seasoning.',
    'Serve hot with plantain and salad.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:nigerian-fried-rice')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 4, 'cups', 'long grain rice, cooked and cooled'),
  (2, 1.5, 'cups', 'mixed vegetables (peas, carrots, green beans, sweetcorn)'),
  (3, 2, 'cups', 'chicken stock'),
  (4, 0.5, 'cup', 'vegetable oil'),
  (5, 1, 'cup', 'diced chicken liver or turkey (optional)'),
  (6, 2, 'bouillon cubes', 'Maggi or Knorr'),
  (7, 1.5, 'teaspoons', 'curry powder'),
  (8, 1, 'teaspoon', 'dried thyme'),
  (9, 2, '', 'onions, diced'),
  (10, 1.5, 'teaspoons', 'salt')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:nigerian-fried-rice')::uuid);

-- 10. Puff-Puff ---------------------------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:puff-puff')::uuid, 'Puff-Puff',
  'Sweet, fluffy fried dough balls — Nigeria’s favourite snack.',
  'Nigerian', 'Snacks', array['snack','fried','sweet','street food'],
  8, 20, 20, 'Easy',
  array[
    'Dissolve yeast and a spoon of sugar in warm water and leave 5 minutes until frothy.',
    'Mix flour, sugar, nutmeg and salt, then pour in the yeast water and whisk to a smooth, thick batter.',
    'Cover and leave in a warm place for 45–60 minutes until doubled.',
    'Heat oil in a deep pot — a drop of batter should rise quickly.',
    'Scoop balls of batter into the hot oil and fry, turning, until golden all over.',
    'Drain on paper towels and serve warm.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:puff-puff')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 4, 'cups', 'all-purpose flour'),
  (2, 0.5, 'cup', 'granulated sugar'),
  (3, 1, 'tablespoon', 'active dry yeast'),
  (4, 1, 'teaspoon', 'nutmeg, ground'),
  (5, 1, 'pinch', 'salt'),
  (6, 2.5, 'cups', 'warm water'),
  (7, 2, 'cups', 'vegetable oil, for deep frying')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:puff-puff')::uuid);

-- 11. Spaghetti Bolognese -----------------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:spaghetti-bolognese')::uuid, 'Spaghetti Bolognese',
  'A comforting Italian-style meat sauce clinging to spaghetti.',
  'Italian', 'Quick Meals', array['pasta','italian','weeknight'],
  4, 10, 40, 'Easy',
  array[
    'Soften onion and garlic in olive oil over medium heat, about 4 minutes.',
    'Add the ground meat and cook until browned, breaking it up with a spoon.',
    'Stir in tomato paste, chopped tomatoes, oregano, basil, salt and pepper.',
    'Simmer gently for 25 minutes, stirring occasionally, until thick.',
    'Boil the spaghetti in salted water until al dente, then drain.',
    'Toss the pasta through the sauce and serve with parmesan.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:spaghetti-bolognese')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 400, 'g', 'spaghetti'),
  (2, 500, 'g', 'ground beef (or pork)'),
  (3, 1, '', 'onion, finely chopped'),
  (4, 3, '', 'garlic cloves, minced'),
  (5, 400, 'g', 'chopped tomatoes'),
  (6, 2, 'tablespoons', 'tomato paste'),
  (7, 1, 'teaspoon', 'dried oregano'),
  (8, 1, 'teaspoon', 'dried basil'),
  (9, 2, 'tablespoons', 'olive oil'),
  (10, 1, 'teaspoon', 'salt'),
  (11, 0.5, 'teaspoon', 'black pepper'),
  (12, 0.5, 'cup', 'parmesan, grated (to serve)')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:spaghetti-bolognese')::uuid);

-- 12. Quick Chicken Stir-Fry --------------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:chicken-stir-fry')::uuid, 'Quick Chicken Stir-Fry',
  'A fast, colourful chicken and vegetable stir-fry for busy nights.',
  'Asian', 'Quick Meals', array['stir fry','quick','chicken','vegetables'],
  4, 15, 12, 'Easy',
  array[
    'Mix soy sauce, oyster sauce, sesame oil and the cornstarch slurry in a bowl.',
    'Heat vegetable oil in a wok until very hot. Stir-fry chicken for 4–5 minutes until golden and cooked through. Set aside.',
    'In the same wok, toss the vegetables with garlic and ginger for 3–4 minutes — they should stay crisp.',
    'Return the chicken, pour in the sauce and stir until glossy and thick, about 1 minute.',
    'Scatter with spring onions and serve over steamed rice.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:chicken-stir-fry')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 500, 'g', 'chicken breast, sliced'),
  (2, 3, 'cups', 'mixed vegetables (broccoli, carrots, peppers, snap peas)'),
  (3, 3, 'tablespoons', 'soy sauce'),
  (4, 1, 'tablespoon', 'oyster sauce (or mushroom sauce)'),
  (5, 1, 'teaspoon', 'sesame oil'),
  (6, 2, 'tablespoons', 'vegetable oil'),
  (7, 3, '', 'garlic cloves, minced'),
  (8, 1, 'teaspoon', 'grated ginger'),
  (9, 1, 'tablespoon', 'cornstarch + 3 tbsp water (slurry)'),
  (10, 2, '', 'spring onions, sliced')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:chicken-stir-fry')::uuid);

-- 13. Fluffy American Pancakes ------------------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:american-pancakes')::uuid, 'Fluffy American Pancakes',
  'Thick, fluffy stack pancakes with maple syrup — a weekend breakfast classic.',
  'American', 'Breakfast', array['pancakes','breakfast','sweet'],
  4, 10, 15, 'Easy',
  array[
    'Whisk flour, sugar, baking powder, baking soda and salt in a large bowl.',
    'In another bowl whisk buttermilk, eggs, melted butter and vanilla.',
    'Fold the wet mix into the dry until just combined — lumps are fine; do not overmix.',
    'Rest the batter 5 minutes while the pan heats over medium heat with a little butter.',
    'Pour ~¼ cup per pancake. Flip when bubbles pop on the surface; cook 1–2 minutes more.',
    'Stack high and serve with maple syrup and butter.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:american-pancakes')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 2, 'cups', 'all-purpose flour'),
  (2, 2, 'tablespoons', 'sugar'),
  (3, 2, 'teaspoons', 'baking powder'),
  (4, 0.5, 'teaspoon', 'baking soda'),
  (5, 0.5, 'teaspoon', 'salt'),
  (6, 2, 'cups', 'buttermilk'),
  (7, 2, '', 'eggs'),
  (8, 3, 'tablespoons', 'melted butter'),
  (9, 1, 'teaspoon', 'vanilla extract'),
  (10, 0.5, 'cup', 'maple syrup (to serve)')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:american-pancakes')::uuid);

-- 14. Chickpea Coconut Curry (Vegetarian) -------------------------------------
insert into public.recipes (id, title, description, cuisine, category, tags, servings, prep_minutes, cook_minutes, difficulty, instructions, image_url)
values (md5('hmr:recipe:chickpea-coconut-curry')::uuid, 'Chickpea Coconut Curry (Vegetarian)',
  'A hearty vegetarian curry with chickpeas in a fragrant coconut-tomato sauce.',
  'Indian', 'Vegetarian', array['vegetarian','vegan option','curry','chickpeas'],
  4, 10, 25, 'Easy',
  array[
    'Soften the onion in oil for 4 minutes, then add garlic, ginger, curry powder and cumin; fry 1 minute until fragrant.',
    'Add chopped tomatoes and a little salt; simmer 8 minutes until saucy.',
    'Pour in the coconut milk and chickpeas; simmer 10 minutes so the flavours sink in.',
    'Stir through the spinach until wilted, then finish with lime juice.',
    'Taste, adjust salt and serve with rice or flatbread.'
  ], '')
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, position, amount, unit, name)
select md5('hmr:recipe:chickpea-coconut-curry')::uuid, v.pos, v.amount, v.unit, v.name
from (values
  (1, 2, 'cups', 'cooked chickpeas (or 1 can, drained)'),
  (2, 400, 'ml', 'coconut milk'),
  (3, 400, 'g', 'chopped tomatoes'),
  (4, 1, '', 'onion, diced'),
  (5, 3, '', 'garlic cloves, minced'),
  (6, 1, 'tablespoon', 'grated ginger'),
  (7, 2, 'tablespoons', 'curry powder'),
  (8, 1, 'teaspoon', 'ground cumin'),
  (9, 1, 'tablespoon', 'vegetable oil'),
  (10, 1, 'teaspoon', 'salt'),
  (11, 2, 'cups', 'spinach'),
  (12, 1, '', 'lime, juiced')
) as v(pos, amount, unit, name)
where not exists (select 1 from public.recipe_ingredients ri where ri.recipe_id = md5('hmr:recipe:chickpea-coconut-curry')::uuid);
