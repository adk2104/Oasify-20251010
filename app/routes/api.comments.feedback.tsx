import type { Route } from './+types/api.comments.feedback';
import { db } from '~/db/config';
import { comments } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '~/sessions.server';

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.get('userId') as number;
  const formData = await request.formData();

  const commentId = formData.get('commentId') as string;
  const feedback = formData.get('feedback') as 'up' | 'down' | null;

  if (!commentId) {
    return Response.json({ error: 'Missing commentId' }, { status: 400 });
  }

  // Validate feedback value
  if (feedback !== null && feedback !== 'up' && feedback !== 'down') {
    return Response.json({ error: 'Invalid feedback value' }, { status: 400 });
  }

  try {
    // Update the comment's feedback
    const [updated] = await db
      .update(comments)
      .set({
        feedback: feedback,
        feedbackAt: feedback ? new Date() : null,
      })
      .where(
        and(
          eq(comments.id, parseInt(commentId)),
          eq(comments.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      return Response.json({ error: 'Comment not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      feedback: updated.feedback,
    });
  } catch (error: any) {
    console.error('Error updating feedback:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
