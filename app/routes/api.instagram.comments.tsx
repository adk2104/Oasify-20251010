import type { Route } from './+types/api.instagram.comments';
import { getSession } from '~/sessions.server';
import { syncInstagramCommentsToDatabase } from '~/utils/instagram.server';
import { db } from '~/db/config';
import { comments } from '~/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/instagram/comments - Read Instagram comments from database
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userId = session.get('userId') as number;

  try {
    const instagramComments = await db
      .select()
      .from(comments)
      .where(and(eq(comments.userId, userId), eq(comments.platform, 'instagram')))
      .orderBy(desc(comments.createdAt));

    const formattedComments = instagramComments.map(c => ({
      id: c.commentId,
      author: c.author,
      authorAvatar: c.authorAvatar || '',
      text: c.text,
      empathicText: c.empathicText || undefined,
      platform: 'instagram' as const,
      mediaId: c.videoId || '',
      createdAt: c.createdAt,
      hasReplied: false,
    }));

    return Response.json({ comments: formattedComments });
  } catch (error) {
    console.error('Get Instagram comments error:', error);
    return Response.json({ comments: [] });
  }
}

// POST /api/instagram/comments - Sync from Instagram
export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userId = session.get('userId') as number;

  try {
    console.log('[INSTAGRAM SYNC START] userId:', userId);
    await syncInstagramCommentsToDatabase(userId);
    console.log('[INSTAGRAM SYNC SUCCESS]');
    return Response.json({ success: true });
  } catch (error) {
    console.log('[INSTAGRAM SYNC ERROR]', error);
    throw new Response('Failed to sync Instagram comments', { status: 500 });
  }
}
