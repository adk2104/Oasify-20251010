import type { Route } from './+types/api.comments.reply';
import { db } from '~/db/config';
import { comments } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '~/sessions.server';
import { postYouTubeReply } from '~/utils/youtube.server';
import { postInstagramReply } from '~/utils/instagram.server';

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.get('userId') as number;
  const formData = await request.formData();

  const platform = formData.get('platform') as 'youtube' | 'instagram';
  const parentCommentId = formData.get('parentCommentId') as string;
  const replyText = formData.get('replyText') as string;

  if (!platform || !parentCommentId || !replyText) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Get parent comment from DB
    const [parentComment] = await db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.userId, userId),
          eq(comments.commentId, parentCommentId),
          eq(comments.platform, platform)
        )
      );

    if (!parentComment) {
      return Response.json({ error: 'Parent comment not found' }, { status: 404 });
    }

    // Post reply to platform
    let result;
    if (platform === 'youtube') {
      result = await postYouTubeReply(userId, parentCommentId, replyText);
    } else {
      result = await postInstagramReply(userId, parentCommentId, replyText);
    }

    // Insert reply into DB
    const [insertedReply] = await db.insert(comments).values({
      userId,
      commentId: result.platformCommentId,
      youtubeCommentId: platform === 'youtube' ? result.platformCommentId : undefined,
      author: 'You', // Owner's reply
      authorAvatar: null,
      text: replyText,
      empathicText: replyText, // No empathy transformation for owner
      videoTitle: parentComment.videoTitle,
      videoId: parentComment.videoId,
      platform,
      isReply: 1,
      parentId: parentComment.id,
      replyCount: 0,
      isOwner: 1,
      createdAt: result.createdAt,
    }).returning();

    // Update parent reply count
    await db
      .update(comments)
      .set({
        replyCount: parentComment.replyCount + 1,
      })
      .where(eq(comments.id, parentComment.id));

    return Response.json({
      success: true,
      reply: insertedReply,
    });
  } catch (error: any) {
    console.error('Error posting reply:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
