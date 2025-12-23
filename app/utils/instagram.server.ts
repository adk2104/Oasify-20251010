import { db } from '~/db/config';
import { providers, comments } from '~/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { generateEmpathicVersion } from './empathy.server';

const GRAPH_API_BASE = 'https://graph.instagram.com';
const INSTAGRAM_API_BASE = 'https://api.instagram.com';

interface InstagramComment {
  id: string;
  author: string;
  text: string;
  empathicText?: string;
  platform: 'instagram';
  mediaId: string;
  createdAt: Date;
}

interface InstagramTokenResponse {
  access_token: string;
  user_id: number;
  permissions?: string[];
}

interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InstagramUserProfile {
  id: string;
  username: string;
  account_type: 'BUSINESS' | 'CREATOR' | 'PERSONAL';
  media_count?: number;
}

// ============================================================================
// INSTAGRAM BUSINESS LOGIN API
// ============================================================================

/**
 * Step 1: Exchange authorization code for short-lived access token
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/#step-2--get-a-short-lived-access-token
 */
export async function exchangeInstagramCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<InstagramTokenResponse> {
  const formData = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`${INSTAGRAM_API_BASE}/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Step 2: Exchange short-lived token for long-lived token (60 days)
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/#long-lived
 */
export async function exchangeForLongLivedInstagramToken(
  shortLivedToken: string,
  clientSecret: string
): Promise<InstagramLongLivedTokenResponse> {
  const url = new URL(`${GRAPH_API_BASE}/access_token`);
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('access_token', shortLivedToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange for long-lived token: ${error}`);
  }

  return response.json();
}

/**
 * Refresh a long-lived token (extends expiry by 60 days)
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/#refresh
 */
export async function refreshLongLivedInstagramToken(
  accessToken: string
): Promise<InstagramLongLivedTokenResponse> {
  const url = new URL(`${GRAPH_API_BASE}/refresh_access_token`);
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Get Instagram user profile (username, account type, etc.)
 */
export async function getInstagramUserProfile(accessToken: string): Promise<InstagramUserProfile> {
  const url = new URL(`${GRAPH_API_BASE}/me`);
  url.searchParams.set('fields', 'id,username,account_type,media_count');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user profile: ${error}`);
  }

  return response.json();
}

/**
 * Get recent media posts from Instagram Business Account
 */
export async function getInstagramMedia(
  accessToken: string,
  limit: number = 20
): Promise<any[]> {
  const url = new URL(`${GRAPH_API_BASE}/me/media`);
  // Try fetching comments as a nested field
  // Note: Instagram API may use 'username' or 'from{username}' depending on the endpoint
  url.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,comments_count,like_count,comments{id,username,from,text,timestamp,like_count,replies{id,username,from,text,timestamp,like_count}}');
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('access_token', accessToken);

  console.log('[INSTAGRAM API] Fetching media with nested comments...');
  console.log('[INSTAGRAM API] URL (token redacted):', url.toString().replace(accessToken, 'REDACTED'));

  const response = await fetch(url.toString());

  console.log('[INSTAGRAM API] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const error = await response.text();
    console.error('[INSTAGRAM API] Get media error:', error);
    throw new Error(`Failed to get media: ${error}`);
  }

  const data = await response.json();
  console.log('[INSTAGRAM API] Received', data.data?.length || 0, 'media posts');

  // Log first media item structure for debugging (without full text dump)
  if (data.data && data.data.length > 0) {
    const firstComment = data.data[0].comments?.data?.[0];
    console.log('[INSTAGRAM API] Sample media structure:', JSON.stringify({
      id: data.data[0].id,
      media_type: data.data[0].media_type,
      comments_count: data.data[0].comments_count,
      has_comments_data: !!data.data[0].comments,
      sample_comment_fields: firstComment ? Object.keys(firstComment) : 'none',
      sample_comment_has_replies: !!firstComment?.replies,
      sample_comment_replies_count: firstComment?.replies?.data?.length || 0
    }, null, 2));
  }

  return data.data || [];
}

/**
 * Get comments on a specific media post (with pagination support)
 */
export async function getInstagramMediaComments(
  mediaId: string,
  accessToken: string
): Promise<any[]> {
  let allComments: any[] = [];
  let url: string | null = `${GRAPH_API_BASE}/${mediaId}/comments?fields=id,username,text,timestamp,like_count,replies{id,username,from,text,timestamp,like_count}&access_token=${accessToken}`;

  console.log('[INSTAGRAM API] Fetching comments for media:', mediaId);

  // Follow pagination to get all comments
  while (url) {
    const response: Response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      console.error('[INSTAGRAM API] Get comments error:', error);
      throw new Error(`Failed to get comments for media ${mediaId}: ${error}`);
    }

    const data: any = await response.json();

    if (data.data && data.data.length > 0) {
      console.log(`[INSTAGRAM API] Fetched ${data.data.length} comments from page`);
      // Log if first comment has replies
      if (data.data[0]) {
        console.log('[INSTAGRAM API] First comment fields:', Object.keys(data.data[0]));
        console.log('[INSTAGRAM API] First comment has replies:', !!data.data[0].replies);
        console.log('[INSTAGRAM API] First comment replies count:', data.data[0].replies?.data?.length || 0);
      }
      allComments.push(...data.data);
    }

    // Check for next page
    url = data.paging?.next || null;

    if (url) {
      console.log('[INSTAGRAM API] Following pagination cursor...');
    }
  }

  console.log('[INSTAGRAM API] Total comments fetched for', mediaId, ':', allComments.length);
  return allComments;
}

/**
 * Get replies for a specific comment
 */
export async function getInstagramCommentReplies(
  commentId: string,
  accessToken: string
): Promise<any[]> {
  const url = new URL(`${GRAPH_API_BASE}/${commentId}/replies`);
  url.searchParams.set('fields', 'id,username,from,text,timestamp,like_count');
  url.searchParams.set('access_token', accessToken);

  console.log(`[INSTAGRAM API] Fetching replies for comment ${commentId}`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    console.error(`[INSTAGRAM API] Get replies error:`, error);
    return []; // Return empty array instead of throwing to continue processing other comments
  }

  const data = await response.json();
  console.log(`[INSTAGRAM API] Found ${data.data?.length || 0} replies for comment ${commentId}`);

  return data.data || [];
}

// Fetch and sync Instagram comments to database
export async function syncInstagramCommentsToDatabase(userId: number): Promise<void> {
  const [provider] = await db.select().from(providers).where(and(eq(providers.userId, userId), eq(providers.platform, 'instagram')));
  if (!provider) throw new Error('Instagram provider not found');

  const accessToken = provider.accessToken;

  // Get owner profile for isOwner detection
  const ownerProfile = await getInstagramUserProfile(accessToken);
  const ownerUsername = ownerProfile.username;

  // Get recent media posts
  const mediaPosts = await getInstagramMedia(accessToken, 20);
  console.log('[INSTAGRAM SYNC] Starting sync for', mediaPosts.length, 'media posts');

  const platformIdToDbId: Record<string, number> = {};
  const replyData: Array<{ parentPlatformId: string; reply: any; mediaId: string; mediaThumbnail: string | null; mediaPermalink: string | null }> = [];

  // Process all media posts
  for (const media of mediaPosts) {
    const mediaPermalink = media.permalink || null;
    // Use thumbnail_url for videos/reels, media_url for images
    const mediaThumbnail = media.thumbnail_url || media.media_url || null;

    try {
      // Try nested comments first
      let commentsToProcess = media.comments?.data || [];
      console.log(`[INSTAGRAM SYNC] Media ${media.id}: Found ${commentsToProcess.length} nested comments (comments_count: ${media.comments_count})`);

      // Fallback to separate endpoint if needed
      if (commentsToProcess.length === 0 && media.comments_count > 0) {
        console.log(`[INSTAGRAM SYNC] Media ${media.id}: Using fallback endpoint for comments`);
        commentsToProcess = await getInstagramMediaComments(media.id, accessToken);
      }

      console.log(`[INSTAGRAM SYNC] Media ${media.id}: Processing ${commentsToProcess.length} comments`);

      // Phase 1: Process top-level comments
      for (const comment of commentsToProcess) {
        if (!comment.id || !comment.text) continue;
        const username = comment.username || comment.from?.username || comment.from?.name;
        if (!username) continue;

        const isOwner = username === ownerUsername;
        const empathicText = isOwner ? comment.text : await generateEmpathicVersion(comment.text);

        const [inserted] = await db.insert(comments).values({
          userId,
          commentId: comment.id,
          author: username,
          authorAvatar: null,
          text: comment.text,
          empathicText,
          videoTitle: null,
          videoId: media.id,
          videoThumbnail: mediaThumbnail,
          videoPermalink: mediaPermalink,
          platform: 'instagram',
          isReply: false,
          replyCount: comment.replies?.data?.length || 0,
          isOwner,
          createdAt: new Date(comment.timestamp),
        }).onConflictDoUpdate({
          target: [comments.userId, comments.commentId, comments.platform],
          set: {
            author: username,
            text: comment.text,
            empathicText,
            videoId: media.id,
            videoThumbnail: mediaThumbnail,
            videoPermalink: mediaPermalink,
            isOwner,
            replyCount: comment.replies?.data?.length || 0,
          },
        }).returning();

        platformIdToDbId[comment.id] = inserted.id;

        // Fetch full reply data if replies exist
        if (comment.replies?.data && comment.replies.data.length > 0) {
          console.log(`[INSTAGRAM SYNC] Comment ${comment.id}: Has ${comment.replies.data.length} replies, fetching full data...`);
          try {
            const fullReplies = await getInstagramCommentReplies(comment.id, accessToken);
            for (const reply of fullReplies) {
              replyData.push({ parentPlatformId: comment.id, reply, mediaId: media.id, mediaThumbnail, mediaPermalink });
            }
          } catch (error) {
            console.error(`[INSTAGRAM SYNC] Error fetching replies for comment ${comment.id}:`, error);
          }
        } else {
          console.log(`[INSTAGRAM SYNC] Comment ${comment.id}: No replies`);
        }
      }
    } catch (error) {
      console.error(`[INSTAGRAM SYNC] Error syncing media ${media.id}:`, error);
    }
  }

  // Phase 2: Process replies
  console.log(`[INSTAGRAM SYNC] Phase 2: Processing ${replyData.length} total replies`);

  for (const { parentPlatformId, reply, mediaId, mediaThumbnail, mediaPermalink } of replyData) {
    const parentDbId = platformIdToDbId[parentPlatformId];
    if (!parentDbId) {
      console.log(`[INSTAGRAM SYNC] Skipping reply ${reply.id}: parent DB ID not found for platform ID ${parentPlatformId}`);
      continue;
    }
    if (!reply.id || !reply.text) {
      console.log(`[INSTAGRAM SYNC] Skipping reply: missing id or text`);
      continue;
    }

    const username = reply.username || reply.from?.username || reply.from?.name;
    const author = username || "Instagram User"; // Fallback for replies without author data

    console.log(`[INSTAGRAM SYNC] Inserting reply ${reply.id} with parentId=${parentDbId} (platform parent: ${parentPlatformId}) - author: ${author}`);

    const isOwner = username ? username === ownerUsername : false;
    const empathicText = isOwner ? reply.text : await generateEmpathicVersion(reply.text);

    await db.insert(comments).values({
      userId,
      commentId: reply.id,
      author: author,
      authorAvatar: null,
      text: reply.text,
      empathicText,
      videoTitle: null,
      videoId: mediaId,
      videoThumbnail: mediaThumbnail,
      videoPermalink: mediaPermalink,
      platform: 'instagram',
      isReply: true,
      parentId: parentDbId,
      replyCount: 0,
      isOwner,
      createdAt: new Date(reply.timestamp),
    }).onConflictDoUpdate({
      target: [comments.userId, comments.commentId, comments.platform],
      set: {
        author: author,
        text: reply.text,
        empathicText,
        videoId: mediaId,
        videoThumbnail: mediaThumbnail,
        videoPermalink: mediaPermalink,
        isOwner,
        parentId: parentDbId,
      },
    });
  }

  // Recalculate reply counts from database
  const parentIds = Object.values(platformIdToDbId);
  console.log(`[INSTAGRAM SYNC] Phase 3: Recalculating reply counts for ${parentIds.length} parent comments`);

  if (parentIds.length > 0) {
    for (const parentId of parentIds) {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.parentId, parentId));

      const actualCount = result[0].count;
      console.log(`[INSTAGRAM SYNC] Parent comment ID ${parentId}: Found ${actualCount} replies in database`);

      await db.update(comments)
        .set({ replyCount: actualCount })
        .where(eq(comments.id, parentId));
    }
  }

  console.log('[INSTAGRAM SYNC] Complete - processed', Object.keys(platformIdToDbId).length, 'comments and', replyData.length, 'replies');
}

// Validate Instagram token
export async function validateInstagramToken(provider: any): Promise<boolean> {
  try {
    // Try to get user profile - works for Instagram Business Login tokens
    await getInstagramUserProfile(provider.accessToken);
    return true;
  } catch (error) {
    console.log('[INSTAGRAM TOKEN VALIDATION] Token is invalid:', error);
    return false;
  }
}

// Post a reply to an Instagram comment
export async function postInstagramReply(
  userId: number,
  parentPlatformCommentId: string,
  replyText: string
): Promise<{ platformCommentId: string; createdAt: Date }> {
  const [provider] = await db.select().from(providers).where(and(eq(providers.userId, userId), eq(providers.platform, 'instagram')));
  if (!provider) throw new Error('Instagram provider not found');

  const response = await fetch(
    `${GRAPH_API_BASE}/${parentPlatformCommentId}/replies?message=${encodeURIComponent(replyText)}&access_token=${provider.accessToken}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    throw new Error(`Failed to post reply: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    platformCommentId: data.id,
    createdAt: new Date(),
  };
}
