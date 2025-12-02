import { db } from '~/db/config';
import { providers, comments } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
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
  url.searchParams.set('fields', 'id,caption,media_type,media_url,timestamp,permalink,comments_count,like_count,comments{id,username,from,text,timestamp,like_count}');
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
    console.log('[INSTAGRAM API] Sample media structure:', JSON.stringify({
      id: data.data[0].id,
      media_type: data.data[0].media_type,
      comments_count: data.data[0].comments_count,
      has_comments_data: !!data.data[0].comments,
      sample_comment_fields: data.data[0].comments?.data?.[0] ? Object.keys(data.data[0].comments.data[0]) : 'none'
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
  let url: string | null = `${GRAPH_API_BASE}/${mediaId}/comments?fields=id,username,text,timestamp,like_count,replies&access_token=${accessToken}`;

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
    console.log('[INSTAGRAM API] Comments page response:', JSON.stringify(data, null, 2));

    if (data.data && data.data.length > 0) {
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

// Fetch and sync Instagram comments to database
export async function syncInstagramCommentsToDatabase(userId: number): Promise<void> {
  console.log('[INSTAGRAM SYNC] Fetching comments for userId:', userId);

  // Get user's Instagram provider
  const [provider] = await db
    .select()
    .from(providers)
    .where(and(eq(providers.userId, userId), eq(providers.platform, 'instagram')));

  if (!provider || provider.platform !== 'instagram') {
    throw new Error('Instagram provider not found');
  }

  const accessToken = provider.accessToken;

  // Get recent media posts using Instagram Business Login API
  console.log('[INSTAGRAM SYNC] Fetching recent media...');
  const mediaPosts = await getInstagramMedia(accessToken, 20);
  console.log('[INSTAGRAM SYNC] Found', mediaPosts.length, 'media posts');

  const allComments: InstagramComment[] = [];

  // Extract comments from media posts (now included as nested field)
  for (const media of mediaPosts) {
    try {
      console.log(`[INSTAGRAM SYNC] Media ${media.id} has ${media.comments_count || 0} comments according to Instagram`);

      // Check if comments were returned in the nested field
      if (media.comments && media.comments.data && media.comments.data.length > 0) {
        console.log(`[INSTAGRAM SYNC] Found ${media.comments.data.length} comments in nested field for media ${media.id}`);

        for (const comment of media.comments.data) {
          // Log raw comment structure to debug field names
          console.log(`[INSTAGRAM SYNC] Raw comment structure:`, JSON.stringify(comment, null, 2));

          // Validate required fields before adding
          if (!comment.id) {
            console.warn(`[INSTAGRAM SYNC] Skipping comment without ID on media ${media.id}`);
            continue;
          }

          if (!comment.text) {
            console.warn(`[INSTAGRAM SYNC] Skipping comment ${comment.id} without text`);
            continue;
          }

          // Check for username - Instagram might use different field names
          const username = comment.username || comment.from?.username || comment.from?.name;

          if (!username) {
            console.warn(`[INSTAGRAM SYNC] Skipping comment ${comment.id} - missing username. Available fields:`, Object.keys(comment));
            continue;
          }

          allComments.push({
            id: comment.id,
            author: username,
            text: comment.text,
            platform: 'instagram',
            mediaId: media.id,
            createdAt: new Date(comment.timestamp),
          });
          console.log(`[INSTAGRAM SYNC] ✓ Added comment ${comment.id} by ${username}`);
        }
      } else if (media.comments_count > 0) {
        // Fallback: try the separate API endpoint
        console.log(`[INSTAGRAM SYNC] No comments in nested field, trying separate endpoint for media ${media.id}`);
        const mediaComments = await getInstagramMediaComments(media.id, accessToken);
        console.log(`[INSTAGRAM SYNC] Found ${mediaComments.length} comments from endpoint for media ${media.id}`);

        if (mediaComments.length === 0) {
          console.warn(`[INSTAGRAM SYNC] WARNING: Instagram reports ${media.comments_count} comments but API returned 0. This may be:`);
          console.warn('  - Self-comments (from account owner)');
          console.warn('  - Hidden/spam filtered comments');
          console.warn('  - Reply comments (not top-level)');
          console.warn('  - API permissions issue');
        }

        for (const comment of mediaComments) {
          // Log raw comment structure to debug field names
          console.log(`[INSTAGRAM SYNC] Raw comment structure:`, JSON.stringify(comment, null, 2));

          // Validate required fields
          if (!comment.id) {
            console.warn(`[INSTAGRAM SYNC] Skipping comment without ID on media ${media.id}`);
            continue;
          }

          if (!comment.text) {
            console.warn(`[INSTAGRAM SYNC] Skipping comment ${comment.id} without text`);
            continue;
          }

          // Check for username - Instagram might use different field names
          const username = comment.username || comment.from?.username || comment.from?.name;

          if (!username) {
            console.warn(`[INSTAGRAM SYNC] Skipping comment ${comment.id} - missing username. Available fields:`, Object.keys(comment));
            continue;
          }

          allComments.push({
            id: comment.id,
            author: username,
            text: comment.text,
            platform: 'instagram',
            mediaId: media.id,
            createdAt: new Date(comment.timestamp),
          });
          console.log(`[INSTAGRAM SYNC] ✓ Added comment ${comment.id} by ${username}`);
        }
      }
    } catch (error) {
      console.error(`[INSTAGRAM SYNC] Error fetching comments for media ${media.id}:`, error);
      // Continue with other posts
    }
  }

  console.log('[INSTAGRAM SYNC] Total comments found:', allComments.length);

  // Query existing Instagram comment IDs to avoid duplicates
  const existingCommentIds = await db
    .select({ commentId: comments.commentId })
    .from(comments)
    .where(
      and(
        eq(comments.userId, userId),
        eq(comments.platform, 'instagram')
      )
    );

  const existingIds = new Set(existingCommentIds.map(c => c.commentId));
  console.log('[INSTAGRAM SYNC] Existing comments in database:', existingIds.size);

  // Store comments in database with empathic versions
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const comment of allComments) {
    // Skip if comment already exists in database
    if (existingIds.has(comment.id)) {
      skippedCount++;
      console.log(`[INSTAGRAM SYNC] ⏭️  Skipping duplicate comment ${comment.id}`);
      continue;
    }
    try {
      console.log('[INSTAGRAM SYNC] Processing comment', comment.id, 'by', comment.author);

      // Generate empathic version
      const empathicText = await generateEmpathicVersion(comment.text);

      // Insert into database (onConflictDoNothing will silently skip duplicates)
      await db.insert(comments).values({
        userId,
        commentId: comment.id,
        author: comment.author,
        authorAvatar: null, // Instagram Graph API doesn't provide profile pictures in basic scope
        text: comment.text,
        empathicText,
        videoTitle: null,
        videoId: comment.mediaId,
        platform: 'instagram',
        createdAt: comment.createdAt,
      }).onConflictDoNothing();

      processedCount++;
      console.log(`[INSTAGRAM SYNC] ✓ Processed comment ${comment.id}`);
    } catch (error) {
      errorCount++;
      console.error(`[INSTAGRAM SYNC] ✗ Error inserting comment ${comment.id}:`, error);
      console.error(`[INSTAGRAM SYNC] Comment data:`, {
        id: comment.id,
        author: comment.author,
        text: comment.text.substring(0, 100),
        mediaId: comment.mediaId,
        createdAt: comment.createdAt,
      });
      // Continue with next comment
    }
  }

  console.log('[INSTAGRAM SYNC] Sync complete - Summary:');
  console.log(`  Total comments found: ${allComments.length}`);
  console.log(`  Skipped (already in DB): ${skippedCount}`);
  console.log(`  Successfully inserted: ${processedCount}`);
  console.log(`  Errors: ${errorCount}`);
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
