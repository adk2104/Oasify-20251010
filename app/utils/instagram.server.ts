import { db } from '~/db/config';
import { providers, comments } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { generateEmpathicVersion } from './empathy.server';

const FB_GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI!;

interface InstagramComment {
  id: string;
  author: string;
  text: string;
  empathicText?: string;
  platform: 'instagram';
  mediaId: string;
  createdAt: Date;
}

// Exchange short-lived token for long-lived token (60 days)
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`${FB_GRAPH_API_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', FACEBOOK_APP_ID);
  url.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange token: ${error}`);
  }

  return response.json();
}

// Get Facebook Pages accessible by user token
export async function getFacebookPages(userAccessToken: string): Promise<any[]> {
  const url = `${FB_GRAPH_API_BASE}/me/accounts?access_token=${userAccessToken}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Facebook pages: ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

// Get Instagram Business Account ID from Facebook Page
export async function getInstagramBusinessAccount(pageId: string, pageAccessToken: string): Promise<{ id: string; username: string }> {
  const url = `${FB_GRAPH_API_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Instagram business account: ${error}`);
  }

  const data = await response.json();

  if (!data.instagram_business_account?.id) {
    throw new Error('No Instagram Business Account linked to this Facebook Page');
  }

  // Get Instagram username
  const igId = data.instagram_business_account.id;
  const igUrl = `${FB_GRAPH_API_BASE}/${igId}?fields=username&access_token=${pageAccessToken}`;
  const igResponse = await fetch(igUrl);

  if (!igResponse.ok) {
    throw new Error('Failed to get Instagram account details');
  }

  const igData = await igResponse.json();

  return {
    id: igId,
    username: igData.username,
  };
}

// Get recent media posts from Instagram Business Account
export async function getRecentMedia(igBusinessId: string, accessToken: string, limit: number = 20): Promise<any[]> {
  const url = `${FB_GRAPH_API_BASE}/${igBusinessId}/media?fields=id,caption,media_type,timestamp&limit=${limit}&access_token=${accessToken}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get media: ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

// Get comments on a specific media post
export async function getMediaComments(mediaId: string, accessToken: string): Promise<any[]> {
  const url = `${FB_GRAPH_API_BASE}/${mediaId}/comments?fields=id,username,text,timestamp&access_token=${accessToken}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get comments for media ${mediaId}: ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

// Fetch and sync Instagram comments to database
export async function syncInstagramCommentsToDatabase(userId: number): Promise<void> {
  console.log('[INSTAGRAM SYNC] Fetching comments for userId:', userId);

  // Get user's Instagram provider
  const [provider] = await db
    .select()
    .from(providers)
    .where(eq(providers.userId, userId))
    .where(eq(providers.platform, 'instagram'));

  if (!provider || provider.platform !== 'instagram') {
    throw new Error('Instagram provider not found');
  }

  const accessToken = provider.accessToken;
  const igBusinessId = provider.platformUserId;

  // Get recent media posts
  console.log('[INSTAGRAM SYNC] Fetching recent media...');
  const mediaPosts = await getRecentMedia(igBusinessId, accessToken, 20);
  console.log('[INSTAGRAM SYNC] Found', mediaPosts.length, 'media posts');

  const allComments: InstagramComment[] = [];

  // Fetch comments for each media post
  for (const media of mediaPosts) {
    try {
      const mediaComments = await getMediaComments(media.id, accessToken);
      console.log(`[INSTAGRAM SYNC] Found ${mediaComments.length} comments for media ${media.id}`);

      for (const comment of mediaComments) {
        allComments.push({
          id: comment.id,
          author: comment.username,
          text: comment.text,
          platform: 'instagram',
          mediaId: media.id,
          createdAt: new Date(comment.timestamp),
        });
      }
    } catch (error) {
      console.error(`[INSTAGRAM SYNC] Error fetching comments for media ${media.id}:`, error);
      // Continue with other posts
    }
  }

  console.log('[INSTAGRAM SYNC] Total comments found:', allComments.length);

  // Store comments in database with empathic versions
  for (const comment of allComments) {
    console.log('[INSTAGRAM SYNC] Processing comment', comment.id);
    const empathicText = await generateEmpathicVersion(comment.text);

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
  }

  console.log('[INSTAGRAM SYNC] Sync complete');
}

// Validate Instagram token
export async function validateInstagramToken(provider: any): Promise<boolean> {
  try {
    const url = `${FB_GRAPH_API_BASE}/${provider.platformUserId}?fields=id&access_token=${provider.accessToken}`;
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    console.log('[INSTAGRAM TOKEN VALIDATION] Token is invalid:', error);
    return false;
  }
}
