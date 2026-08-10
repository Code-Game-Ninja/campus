import type { FeedTab, Post, Scope } from '@/types';

export type ReactionKind = 'like' | 'celebrate' | 'insightful' | 'support';
export interface PostPollOption { id: string; label: string; votes: number; viewerSelected: boolean }
export interface PostPoll { postId: string; allowsMultiple: boolean; closesAt: string | null; options: PostPollOption[] }
export interface PostMediaItem { url: string; type: 'image' | 'document'; name: string | null }
export interface ApiPost {
  id: string;
  scope: Scope;
  authorMode: 'named' | 'official';
  author: { userId: string; displayName: string; avatarUrl: string | null };
  title: string | null;
  body: string;
  kind: Post['kind'];
  visibility: 'public' | 'campus' | 'followers';
  reactions: Record<ReactionKind, number>;
  commentCount: number;
  publishedAt: string;
  editedAt: string | null;
  whyThis: string[];
  version: number;
  viewerReaction?: ReactionKind | null;
  viewerBookmarked?: boolean;
  mediaUrls?: string[];
  mediaItems?: PostMediaItem[];
  linkPreview?: { url: string; title: string; description: string | null } | null;
  poll?: PostPoll | null;
  eventId?: string | null;
  teamRequestId?: string | null;
  recruitment?: boolean;
}

export interface FeedPage { items: ApiPost[]; nextCursor: string | null }
export interface MeView { userId: string; campusId: string }
export interface ApiComment {
  id: string;
  postId: string;
  parentId: string | null;
  author: { userId: string; displayName: string; avatarUrl: string | null };
  body: string;
  createdAt: string;
}
export interface CommentPage { items: ApiComment[]; nextCursor: string | null }

export function setPostLike(post: ApiPost, liked: boolean): ApiPost {
  const currentlyLiked = post.viewerReaction === 'like';
  if (currentlyLiked === liked) return post;
  return {
    ...post,
    viewerReaction: liked ? 'like' : null,
    reactions: {
      ...post.reactions,
      like: Math.max(0, post.reactions.like + (liked ? 1 : -1)),
    },
  };
}

export function setPostBookmark(post: ApiPost, bookmarked: boolean): ApiPost {
  if (Boolean(post.viewerBookmarked) === bookmarked) return post;
  return { ...post, viewerBookmarked: bookmarked };
}

const accents: Record<Post['kind'], string> = {
  discussion: '#EAF7FF',
  announcement: '#FFF0ED',
  achievement: '#EAFBF4',
  meme: '#FFF7D6',
};

export function feedRank(tab: FeedTab): 'for_you' | 'following' | 'official' {
  if (tab === 'Following') return 'following';
  return tab === 'Official' ? 'official' : 'for_you';
}

export function mapPost(post: ApiPost, campus: string): Post {
  const initials = post.author.displayName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CS';
  return {
    id: post.id,
    author: post.author.displayName,
    authorId: post.author.userId,
    authorType: 'person',
    initials,
    time: relativeTime(post.editedAt ?? post.publishedAt, Boolean(post.editedAt)),
    campus: post.scope === 'campus' ? campus : 'Global',
    scope: post.scope,
    kind: post.kind,
    title: post.title ?? undefined,
    body: post.body,
    accent: accents[post.kind],
    reactions: Object.values(post.reactions).reduce((sum, count) => sum + count, 0),
    comments: post.commentCount,
    // The heart represents only the `like` reaction. Other reaction kinds
    // must not make the like button appear active or alter its optimistic count.
    reacted: post.viewerReaction === 'like',
    saved: Boolean(post.viewerBookmarked),
    official: post.authorMode === 'official',
    why: post.whyThis.join(' · ') || 'Recommended from your current feed.',
    media: post.mediaUrls,
    mediaItems: post.mediaItems,
    linkPreview: post.linkPreview ?? undefined,
    poll: post.poll ?? undefined,
    eventId: post.eventId ?? undefined,
    teamRequestId: post.teamRequestId ?? undefined,
    recruitment: post.recruitment ?? false,
    version: post.version,
  };
}

export function relativeTime(value: string, edited = false): string {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60_000);
  const label = minutes < 1 ? 'Now' : minutes < 60 ? `${minutes}m` : minutes < 1_440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1_440)}d`;
  return edited ? `Edited ${label}` : label;
}
