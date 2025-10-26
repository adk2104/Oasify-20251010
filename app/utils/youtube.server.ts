import { db } from '~/db/config';
import { providers, comments } from '~/db/schema';
import { eq, desc } from 'drizzle-orm';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

interface YouTubeComment {
  id: string;
  author: string;
  authorAvatar: string;
  text: string;
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

  // Get channel's uploads playlist
  const channelResponse = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=contentDetails&mine=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!channelResponse.ok) {
    throw new Error(`Failed to fetch channel: ${channelResponse.statusText}`);
  }

  const channelData = await channelResponse.json();
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

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
        `${YOUTUBE_API_BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=time`,
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
            hasReplied: false, // We don't track this without storing comments
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching comments for video ${videoId}:`, error);
      // Continue with other videos
    }
  }

  // Sort by most recent first
  allComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return allComments;
}

// Sync comments from YouTube to database
export async function syncYouTubeCommentsToDatabase(userId: number): Promise<void> {
  const freshComments = await fetchYouTubeComments(userId);

  for (const comment of freshComments) {
    await db.insert(comments).values({
      userId,
      youtubeCommentId: comment.id,
      author: comment.author,
      authorAvatar: comment.authorAvatar,
      text: comment.text,
      videoTitle: comment.videoTitle,
      videoId: comment.videoId,
      platform: 'youtube',
      createdAt: comment.createdAt,
    }).onConflictDoNothing();
  }
}

// Get stored comments from database
export async function getStoredComments(userId: number): Promise<YouTubeComment[]> {
  const storedComments = await db
    .select()
    .from(comments)
    .where(eq(comments.userId, userId))
    .orderBy(desc(comments.createdAt));

  return storedComments.map(c => ({
    id: c.youtubeCommentId,
    author: c.author,
    authorAvatar: c.authorAvatar || '',
    text: c.text,
    platform: 'youtube' as const,
    videoTitle: c.videoTitle || '',
    videoId: c.videoId || '',
    createdAt: c.createdAt,
    hasReplied: false,
  }));
}
