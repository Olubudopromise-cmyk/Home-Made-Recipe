import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { FollowButton } from '../components/FollowButton';
import { KitchenPanel } from '../components/KitchenPanel';
import { PostCard } from '../components/PostCard';
import { Spinner } from '../components/Spinner';
import { VideoCard } from '../components/VideoCard';
import { useAuth } from '../context/AuthContext';
import { useLikes } from '../hooks/useLikes';
import { friendlyError } from '../lib/format';
import {
  countFollowers,
  countFollowing,
  listFollowerProfiles,
  listFollowingProfiles,
} from '../services/follows';
import { countPostsByAuthor, listPostsByAuthor } from '../services/posts';
import { getProfile } from '../services/users';
import { countVideosByAuthor, listVideosByAuthor } from '../services/videos';
import type { Post, UserProfile, VideoPost } from '../types';

type Tab = 'posts' | 'videos' | 'followers' | 'following' | 'kitchen';

export function ProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { user } = useAuth();
  const isOwn = Boolean(user && uid && user.uid === uid);

  const [profile, setProfile] = useState<UserProfile | null | 'missing'>(null);
  const [counts, setCounts] = useState({ posts: 0, videos: 0, followers: 0, following: 0 });
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [videos, setVideos] = useState<VideoPost[] | null>(null);
  const [followers, setFollowers] = useState<UserProfile[] | null>(null);
  const [followingList, setFollowingList] = useState<UserProfile[] | null>(null);
  const [error, setError] = useState('');
  const postLikes = useLikes('post', posts ? posts.map((p) => p.id) : []);
  const videoLikes = useLikes('video', videos ? videos.map((v) => v.id) : []);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    setProfile(null);
    setTab('posts');
    setPosts(null);
    setVideos(null);
    setFollowers(null);
    setFollowingList(null);
    (async () => {
      try {
        const item = await getProfile(uid);
        if (!alive) return;
        setProfile(item ?? 'missing');
        if (!item) return;
        const [followerCount, followingCount, postCount, videoCount] = await Promise.all([
          countFollowers(uid).catch(() => 0),
          countFollowing(uid).catch(() => 0),
          countPostsByAuthor(uid).catch(() => 0),
          countVideosByAuthor(uid).catch(() => 0),
        ]);
        if (!alive) return;
        setCounts({
          followers: followerCount,
          following: followingCount,
          posts: postCount,
          videos: videoCount,
        });
      } catch (err) {
        if (alive) setError(friendlyError(err));
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || profile === null || profile === 'missing') return;
    let alive = true;
    if (tab === 'posts' && posts === null) {
      listPostsByAuthor(uid, 50)
        .then((items) => alive && setPosts(items))
        .catch((err) => alive && setError(friendlyError(err)));
    } else if (tab === 'videos' && videos === null) {
      listVideosByAuthor(uid, 50)
        .then((items) => alive && setVideos(items))
        .catch((err) => alive && setError(friendlyError(err)));
    } else if (tab === 'followers' && followers === null) {
      listFollowerProfiles(uid)
        .then((items) => alive && setFollowers(items))
        .catch((err) => alive && setError(friendlyError(err)));
    } else if (tab === 'following' && followingList === null) {
      listFollowingProfiles(uid)
        .then((items) => alive && setFollowingList(items))
        .catch((err) => alive && setError(friendlyError(err)));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, uid, profile]);

  if (error) return <p className="error-text">{error}</p>;
  if (profile === null) return <Spinner label="Loading profile…" />;
  if (profile === 'missing')
    return (
      <EmptyState
        emoji="👤"
        title="This cook hasn't joined yet"
        hint="The profile may have been removed."
      />
    );

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'posts', label: `Posts (${counts.posts})` },
    { key: 'videos', label: `Videos (${counts.videos})` },
    { key: 'followers', label: `Followers (${counts.followers})` },
    { key: 'following', label: `Following (${counts.following})` },
  ];
  if (isOwn) tabs.push({ key: 'kitchen', label: 'My Kitchen' });

  return (
    <div>
      <div className="profile-header card">
        <Avatar user={profile} size={88} />
        <div className="profile-header-body">
          <h1>{profile.displayName}</h1>
          {profile.location ? <p className="muted">{profile.location}</p> : null}
          {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}
          <div className="profile-stats">
            <span>
              <strong>{counts.posts}</strong> posts
            </span>
            <span>
              <strong>{counts.videos}</strong> videos
            </span>
            <span>
              <strong>{counts.followers}</strong> followers
            </span>
            <span>
              <strong>{counts.following}</strong> following
            </span>
          </div>
        </div>
        <div className="profile-actions">
          {isOwn ? (
            <>
              <Link to={`/u/${uid}/edit`} className="btn btn-secondary">
                Edit profile
              </Link>
            </>
          ) : (
            <FollowButton targetUid={uid ?? ''} />
          )}
        </div>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`tab ${tab === t.key ? 'tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'posts' ? (
        posts === null ? (
          <Spinner label="Loading posts…" />
        ) : posts.length === 0 ? (
          <EmptyState emoji="📝" title="No posts yet" hint="Food posts from this cook will appear here." />
        ) : (
          <div className="feed">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                liked={postLikes.liked.has(post.id)}
                onToggleLike={(id, wasLiked) => postLikes.toggle(id, wasLiked)}
                showTopic
                onDeleted={(id) => setPosts((prev) => (prev ?? []).filter((p) => p.id !== id))}
              />
            ))}
          </div>
        )
      ) : null}

      {tab === 'videos' ? (
        videos === null ? (
          <Spinner label="Loading videos…" />
        ) : videos.length === 0 ? (
          <EmptyState emoji="🎥" title="No videos yet" hint="Short cooking videos from this cook will appear here." />
        ) : (
          <div className="video-feed profile-videos">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                liked={videoLikes.liked.has(video.id)}
                onToggleLike={(id, wasLiked) => videoLikes.toggle(id, wasLiked)}
                onDeleted={(id) => setVideos((prev) => (prev ?? []).filter((v) => v.id !== id))}
              />
            ))}
          </div>
        )
      ) : null}

      {tab === 'followers' || tab === 'following' ? (
        (() => {
          const list = tab === 'followers' ? followers : followingList;
          const label = tab === 'followers' ? 'followers' : 'people this cook follows';
          if (list === null) return <Spinner label={`Loading ${label}…`} />;
          if (list.length === 0)
            return (
              <EmptyState
                emoji="🤝"
                title={tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                hint={
                  tab === 'followers'
                    ? 'When other cooks follow this profile, they show up here.'
                    : 'When this cook follows other creators, they show up here.'
                }
              />
            );
          return (
            <ul className="creator-list card">
              {list.map((person) => (
                <li key={person.uid} className="creator-row">
                  <Link to={`/u/${person.uid}`} className="creator-info">
                    <Avatar user={person} size={40} />
                    <span>
                      <strong>{person.displayName}</strong>
                      {person.bio ? <span className="muted small"> — {person.bio}</span> : null}
                    </span>
                  </Link>
                  <FollowButton targetUid={person.uid} size="sm" />
                </li>
              ))}
            </ul>
          );
        })()
      ) : null}

      {tab === 'kitchen' ? <KitchenPanel uid={uid ?? ''} /> : null}
    </div>
  );
}
