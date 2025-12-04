import { db } from '~/db/config';
import { comments } from '~/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export type CommentWithReplies = {
  comment: typeof comments.$inferSelect;
  replies: CommentWithReplies[]; // Recursive type for nested replies
};

export async function getCommentsWithReplies(
  userId: number,
  platform?: 'youtube' | 'instagram'
): Promise<CommentWithReplies[]> {
  const whereClause = platform
    ? and(eq(comments.userId, userId), eq(comments.platform, platform))
    : eq(comments.userId, userId);

  const all = await db.select().from(comments).where(whereClause);

  // Group ALL comments by parentId (including nested replies)
  const byParent: Record<string, typeof all> = {};

  for (const c of all) {
    const key = c.parentId ? String(c.parentId) : 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  }

  // Recursive function to build nested thread structure
  function buildThread(comment: typeof all[0]): CommentWithReplies {
    const childReplies = byParent[String(comment.id)] || [];
    return {
      comment,
      replies: childReplies.map(buildThread), // Recursively build nested replies
    };
  }

  const roots = byParent['root'] || [];
  return roots.map(buildThread);
}
