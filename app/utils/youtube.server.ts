import { db } from '~/db/config';
import { providers, comments } from '~/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { generateEmpathicVersion } from './empathy.server';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

interface YouTubeComment {
  id: string;
  author: string;
  authorAvatar: string;
  text: string;
  empathicText?: string;
  platform: 'youtube';
  videoTitle: string;
  videoId: string;
  createdAt: Date;
  hasReplied: boolean;
}

// Refresh Google OAuth token
export async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  return response.json();
}

// Get valid access token, refresh if needed
async function getValidAccessToken(provider: any): Promise<string> {
  // Check if token is expired
  if (provider.expiresAt && new Date(provider.expiresAt) <= new Date()) {
    if (!provider.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokens = await refreshGoogleToken(provider.refreshToken);

    // Update provider with new tokens
    await db
      .update(providers)
      .set({
        accessToken: tokens.access_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(providers.id, provider.id));

    return tokens.access_token;
  }

  return provider.accessToken;
}

// Fetch recent comments from user's YouTube channel
export async function fetchYouTubeComments(userId: number): Promise<YouTubeComment[]> {
  // Get user's YouTube provider
  const [provider] = await db
    .select()
    .from(providers)
    .where(eq(providers.userId, userId));

  if (!provider || provider.platform !== 'youtube') {
    throw new Error('YouTube provider not found');
  }

  const accessToken = await getValidAccessToken(provider);

  // Get channel info (for isOwner detection)
  const channelResponse = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=contentDetails,snippet&mine=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!channelResponse.ok) {
    throw new Error(`Failed to fetch channel: ${channelResponse.statusText}`);
  }

  const channelData = await channelResponse.json();
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  const channelId = channelData.items?.[0]?.id;

  if (!uploadsPlaylistId) {
    return [];
  }

  // Get recent videos from uploads playlist (limit to 5 to avoid quota issues)
  const playlistResponse = await fetch(
    `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=5`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!playlistResponse.ok) {
    throw new Error(`Failed to fetch playlist: ${playlistResponse.statusText}`);
  }

  const playlistData = await playlistResponse.json();
  const allComments: YouTubeComment[] = [];

  // Fetch comments for each video
  for (const item of playlistData.items || []) {
    const videoId = item.snippet.resourceId.videoId;
    const videoTitle = item.snippet.title;

    try {
      const commentsResponse = await fetch(
        `${YOUTUBE_API_BASE}/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=20&order=time`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();

        for (const thread of commentsData.items || []) {
          const comment = thread.snippet.topLevelComment;
          allComments.push({
            id: comment.id,
            author: comment.snippet.authorDisplayName,
            authorAvatar: comment.snippet.authorProfileImageUrl,
            text: comment.snippet.textDisplay,
            platform: 'youtube',
            videoTitle,
            videoId,
            createdAt: new Date(comment.snippet.publishedAt),
            hasReplied: false,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching comments for video ${videoId}:`, error);
    }
  }

  // Sort by most recent first
  allComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return allComments;
}

// Sync comments from YouTube to database
export async function syncYouTubeCommentsToDatabase(userId: number): Promise<void> {
  const [provider] = await db.select().from(providers).where(eq(providers.userId, userId));
  if (!provider || provider.platform !== 'youtube') throw new Error('YouTube provider not found');

  const accessToken = await getValidAccessToken(provider);

  // Get channel ID for isOwner detection
  const channelResponse = await fetch(`${YOUTUBE_API_BASE}/channels?part=contentDetails,snippet&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const channelData = await channelResponse.json();
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  const ownerChannelId = channelData.items?.[0]?.id;

  if (!uploadsPlaylistId) return;

  // Get recent videos
  const playlistResponse = await fetch(
    `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=5`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const playlistData = await playlistResponse.json();

  const platformIdToDbId: Record<string, number> = {};
  const replyData: Array<{ parentPlatformId: string; reply: any }> = [];

  // Fetch and process all comments
  for (const item of playlistData.items || []) {
    const videoId = item.snippet.resourceId.videoId;
    const videoTitle = item.snippet.title;
    const videoThumbnail = item.snippet.thumbnails.medium?.url ||
                           item.snippet.thumbnails.default?.url ||
                           null;

    try {
      const commentsResponse = await fetch(
        `${YOUTUBE_API_BASE}/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=20&order=time`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!commentsResponse.ok) continue;
      const commentsData = await commentsResponse.json();

      // Phase 1: Process top-level comments
      for (const thread of commentsData.items || []) {
        const comment = thread.snippet.topLevelComment;
        const snippet = comment.snippet;
        const platformCommentId = comment.id;
        const isOwner = snippet.authorChannelId?.value === ownerChannelId;

        // Generate empathic text only if not owner
        const empathicText = isOwner ? snippet.textDisplay : await generateEmpathicVersion(snippet.textDisplay);

        const [inserted] = await db.insert(comments).values({
          userId,
          commentId: platformCommentId,
          youtubeCommentId: platformCommentId,
          author: snippet.authorDisplayName,
          authorAvatar: snippet.authorProfileImageUrl,
          text: snippet.textDisplay,
          empathicText,
          videoTitle,
          videoId,
          videoThumbnail,
          videoPermalink: null,
          platform: 'youtube',
          isReply: false,
          replyCount: thread.snippet.totalReplyCount || 0,
          isOwner,
          createdAt: new Date(snippet.publishedAt),
        }).onConflictDoUpdate({
          target: [comments.userId, comments.commentId, comments.platform],
          set: {
            text: snippet.textDisplay,
            empathicText,
            isOwner,
            replyCount: thread.snippet.totalReplyCount || 0,
            videoThumbnail,
          },
        }).returning();

        platformIdToDbId[platformCommentId] = inserted.id;

        // Collect replies for phase 2
        if (thread.replies?.comments) {
          for (const reply of thread.replies.comments) {
            replyData.push({ parentPlatformId: platformCommentId, reply });
          }
        }
      }
    } catch (error) {
      console.error(`Error syncing video ${videoId}:`, error);
    }
  }

  // Phase 2: Process replies
  for (const { parentPlatformId, reply } of replyData) {
    const parentDbId = platformIdToDbId[parentPlatformId];
    if (!parentDbId) continue;

    const snippet = reply.snippet;
    const isOwner = snippet.authorChannelId?.value === ownerChannelId;
    const empathicText = isOwner ? snippet.textDisplay : await generateEmpathicVersion(snippet.textDisplay);

    await db.insert(comments).values({
      userId,
      commentId: reply.id,
      youtubeCommentId: reply.id,
      author: snippet.authorDisplayName,
      authorAvatar: snippet.authorProfileImageUrl,
      text: snippet.textDisplay,
      empathicText,
      videoTitle: snippet.videoId || '',
      videoId: snippet.videoId || '',
      videoThumbnail: null,
      videoPermalink: null,
      platform: 'youtube',
      isReply: true,
      parentId: parentDbId,
      replyCount: 0,
      isOwner,
      createdAt: new Date(snippet.publishedAt),
    }).onConflictDoUpdate({
      target: [comments.userId, comments.commentId, comments.platform],
      set: {
        text: snippet.textDisplay,
        empathicText,
        isOwner,
        parentId: parentDbId,
      },
    });
  }

  // Recalculate reply counts from database
  const parentIds = Object.values(platformIdToDbId);
  if (parentIds.length > 0) {
    for (const parentId of parentIds) {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.parentId, parentId));

      await db.update(comments)
        .set({ replyCount: result[0].count })
        .where(eq(comments.id, parentId));
    }
  }

  console.log('[SYNC] Complete');
}

// Validate if YouTube token is still valid
export async function validateYouTubeToken(provider: any): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken(provider);

    // Make a lightweight API call to check if token works
    const response = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=id&mine=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.ok;
  } catch (error) {
    console.log('[TOKEN VALIDATION] Token is invalid:', error);
    return false;
  }
}

// Generate empathic versions for existing comments without them
export async function generateEmpathicForExistingComments(userId: number): Promise<number> {
  console.log('[GENERATE] Finding comments without empathic versions for userId:', userId);

  const allComments = await db
    .select()
    .from(comments)
    .where(eq(comments.userId, userId));

  console.log('[GENERATE] Processing', allComments.length, 'comments (regenerating all)');

  for (const comment of allComments) {
    console.log('[GENERATE] Processing comment', comment.id);
    console.log('[GENERATE] Original:', comment.text.substring(0, 100));
    const empathicText = await generateEmpathicVersion(comment.text);
    console.log('[GENERATE] Empathic:', empathicText.substring(0, 100));

    await db
      .update(comments)
      .set({ empathicText })
      .where(eq(comments.id, comment.id));

    console.log('[GENERATE] Updated comment', comment.id);
  }

  return allComments.length;
}

// Get stored comments from database
export async function getStoredComments(userId: number): Promise<YouTubeComment[]> {
  const storedComments = await db
    .select()
    .from(comments)
    .where(and(eq(comments.userId, userId), eq(comments.platform, 'youtube')))
    .orderBy(desc(comments.createdAt));

  return storedComments.map(c => ({
    id: c.commentId,
    author: c.author,
    authorAvatar: c.authorAvatar || '',
    text: c.text,
    empathicText: c.empathicText || undefined,
    platform: 'youtube' as const,
    videoTitle: c.videoTitle || '',
    videoId: c.videoId || '',
    createdAt: c.createdAt,
    hasReplied: false,
  }));
}

// Post a reply to a YouTube comment
export async function postYouTubeReply(
  userId: number,
  parentPlatformCommentId: string,
  replyText: string
): Promise<{ platformCommentId: string; createdAt: Date }> {
  const [provider] = await db.select().from(providers).where(eq(providers.userId, userId));
  if (!provider || provider.platform !== 'youtube') throw new Error('YouTube provider not found');

  const accessToken = await getValidAccessToken(provider);

  const response = await fetch(`${YOUTUBE_API_BASE}/comments?part=snippet`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        parentId: parentPlatformCommentId,
        textOriginal: replyText,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to post reply: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    platformCommentId: data.id,
    createdAt: new Date(data.snippet.publishedAt),
  };
}
