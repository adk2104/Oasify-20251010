import { db } from '~/db/config';
import { providers } from '~/db/schema';
import { eq } from 'drizzle-orm';

const INSTAGRAM_API_BASE = 'https://graph.facebook.com/v18.0';

interface InstagramComment {
  id: string;
  author: string;
  authorAvatar?: string;
  text: string;
  platform: 'instagram';
  postCaption?: string;
  postId: string;
  mediaUrl?: string;
  createdAt: Date;
  hasReplied: boolean;
}

// Fetch recent comments from user's Instagram Business Account
export async function fetchInstagramComments(userId: number): Promise<InstagramComment[]> {
  // Get user's Instagram provider
  const [provider] = await db
    .select()
    .from(providers)
    .where(eq(providers.userId, userId));

  if (!provider || provider.platform !== 'instagram') {
    throw new Error('Instagram provider not found');
  }

  const accessToken = provider.accessToken;
  const instagramAccountId = provider.platformUserId;

  try {
    // Get recent media (posts) from Instagram Business Account
    const mediaResponse = await fetch(
      `${INSTAGRAM_API_BASE}/${instagramAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=10&access_token=${accessToken}`
    );

    if (!mediaResponse.ok) {
      throw new Error(`Failed to fetch media: ${mediaResponse.statusText}`);
    }

    const mediaData = await mediaResponse.json();
    const allComments: InstagramComment[] = [];

    // Fetch comments for each media item
    for (const media of mediaData.data || []) {
      try {
        const commentsResponse = await fetch(
          `${INSTAGRAM_API_BASE}/${media.id}/comments?fields=id,text,username,timestamp,from&limit=25&access_token=${accessToken}`
        );

        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();

          for (const comment of commentsData.data || []) {
            allComments.push({
              id: comment.id,
              author: comment.username || comment.from?.username || 'Unknown',
              authorAvatar: undefined, // Instagram API doesn't provide avatar URLs in basic tier
              text: comment.text,
              platform: 'instagram',
              postCaption: media.caption?.substring(0, 100), // Truncate long captions
              postId: media.id,
              mediaUrl: media.thumbnail_url || media.media_url,
              createdAt: new Date(comment.timestamp),
              hasReplied: false, // We don't track this without storing comments
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching comments for media ${media.id}:`, error);
        // Continue with other media items
      }
    }

    // Sort by most recent first
    allComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return allComments;
  } catch (error) {
    console.error('Instagram API error:', error);
    throw error;
  }
}
