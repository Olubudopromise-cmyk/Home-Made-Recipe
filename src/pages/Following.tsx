import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { FollowButton } from '../components/FollowButton';
import { PostCard } from '../components/PostCard';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useLikes } from '../hooks/useLikes';
import { friendlyError } from '../lib/format';
import { listFollowingIds } from '../services/follows';
import { listPostsByAuthors } from '../services/posts';
import { listRecentUsers } from '../services/users';
import type { Post, UserProfile } from '../types';

export function FollowingPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [suggestions, setSuggestions] = useState<UserProfile[] | null>(null);
  const [error, setError] = useState('');
  const { liked, toggle } = useLikes('post', posts ? posts.map((p) => p.id) : []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    setPosts(null);
    (async () => {
      try {
        const followingIds = await listFollowingIds(user.uid);
        if (followingIds.length === 0) {
          const others = await listRecentUsers(8);
          if (!alive) return;
          setPosts([]);
          setSuggestions(others.filter((u) => u.uid !== user.uid));
          return;
        }
        const items = await listPostsByAuthors(followingIds, 50);
        if (alive) setPosts(items);
      } catch (err) {
        if (alive) setError(friendlyError(err));
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) return <Spinner label="Loading your feed…" />;

  return (
    <div className="narrow">
      <h1 className="page-title">Following</h1>
      <p className="muted">Real posts from real people you follow.</p>

      {error ? <p className="error-text">{error}</p> : null}

      {posts === null ? (
        <Spinner label="Loading posts from people you follow…" />
      ) : posts.length > 0 ? (
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
      ) : suggestions && suggestions.length > 0 ? (
        <>
          <EmptyState
            emoji="👋"
            title="You're not following anyone yet"
            hint="Follow cooks whose food you like and their posts will show up here."
          />
          <section className="card side-card">
            <h2>Suggested food creators</h2>
            <ul className="creator-list">
              {suggestions.map((creator) => (
                <li key={creator.uid} className="creator-row">
                  <Link to={`/u/${creator.uid}`} className="creator-info">
                    <Avatar user={creator} size={38} />
                    <span>
                      <strong>{creator.displayName}</strong>
                    </span>
                  </Link>
                  <FollowButton
                    targetUid={creator.uid}
                    size="sm"
                    onDidChange={(following) => {
                      if (following) {
                        setPosts(null);
                        listFollowingIds(user.uid)
                          .then((ids) => (ids.length ? listPostsByAuthors(ids, 50) : []))
                          .then(setPosts)
                          .catch((err) => setError(friendlyError(err)));
                      }
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <EmptyState
          emoji="🍳"
          title="No posts yet"
          hint="The people you follow haven't posted yet."
        />
      )}
    </div>
  );
}
