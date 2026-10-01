import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Composer } from '../components/Composer';
import { EmptyState } from '../components/EmptyState';
import { FollowButton } from '../components/FollowButton';
import { PostCard } from '../components/PostCard';
import { RecipeCard } from '../components/RecipeCard';
import { Spinner } from '../components/Spinner';
import { Avatar } from '../components/Avatar';
import { useLikes } from '../hooks/useLikes';
import { friendlyError } from '../lib/format';
import { listRecentPosts } from '../services/posts';
import { listRecipes } from '../services/recipes';
import { listRecentUsers } from '../services/users';
import type { Post, Recipe, UserProfile } from '../types';

export function HomePage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [creators, setCreators] = useState<UserProfile[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState('');
  const { liked, toggle } = useLikes('post', posts ? posts.map((p) => p.id) : []);

  useEffect(() => {
    let alive = true;
    Promise.all([listRecentPosts(50), listRecentUsers(6), listRecipes(4)])
      .then(([postItems, userItems, recipeItems]) => {
        if (!alive) return;
        setPosts(postItems);
        setCreators(userItems);
        setRecipes(recipeItems);
      })
      .catch((err) => {
        if (alive) setError(friendlyError(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  function prepend(post: Post) {
    setPosts((prev) => [post, ...(prev ?? [])]);
  }

  return (
    <div className="home-grid">
      <div className="home-main">
        <div className="hero card">
          <h1>Discover → Learn → Cook → Share → Watch → Follow</h1>
          <p>
            <strong>Nigerian-rooted, globally open.</strong> Jollof, Egusi and Suya on one side of
            the kitchen; the whole world&apos;s food on the other.
          </p>
        </div>

        <Composer topic="food" onPosted={prepend} />

        {error ? <p className="error-text">{error}</p> : null}

        {posts === null ? (
          <Spinner label="Loading the feed…" />
        ) : posts.length === 0 ? (
          <EmptyState
            emoji="🍳"
            title="The kitchen is quiet"
            hint="Share the first post — what are you cooking today?"
          />
        ) : (
          <div className="feed">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                liked={liked.has(post.id)}
                onToggleLike={(id, wasLiked) => toggle(id, wasLiked)}
                showTopic
                onDeleted={(id) => setPosts((prev) => (prev ?? []).filter((p) => p.id !== id))}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="home-side">
        <section className="card side-card">
          <h2>Discover creators</h2>
          {creators.length === 0 ? (
            <p className="muted small">No cooks have joined yet — you could be the first.</p>
          ) : (
            <ul className="creator-list">
              {creators.map((creator) => (
                <li key={creator.uid} className="creator-row">
                  <Link to={`/u/${creator.uid}`} className="creator-info">
                    <Avatar user={creator} size={38} />
                    <span>
                      <strong>{creator.displayName}</strong>
                      {creator.location ? (
                        <span className="muted small"> · {creator.location}</span>
                      ) : null}
                    </span>
                  </Link>
                  <FollowButton targetUid={creator.uid} size="sm" />
                </li>
              ))}
            </ul>
          )}
          <Link to="/recipes" className="side-link">
            Browse recipes →
          </Link>
        </section>

        {recipes.length > 0 ? (
          <section className="card side-card">
            <h2>Fresh recipes</h2>
            <div className="side-recipes">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
