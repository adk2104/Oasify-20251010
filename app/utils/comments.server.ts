import { db } from '~/db/config';
import { comments } from '~/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export type CommentWithReplies = {
  comment: typeof comments.$inferSelect;
  replies: (typeof comments.$inferSelect)[];
};

export async function getCommentsWithReplies(
  userId: number,
  platform?: 'youtube' | 'instagram'
): Promise<CommentWithReplies[]> {
  const whereClause = platform
    ? and(eq(comments.userId, userId), eq(comments.platform, platform))
    : eq(comments.userId, userId);

  const all = await db.select().from(comments).where(whereClause);

  // Group by parent
  const byParent: Record<string, typeof all> = { root: [] };

  for (const c of all) {
    const key = c.parentId ? String(c.parentId) : 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  }

  const roots = byParent['root'] || [];

  return roots.map(root => ({
    comment: root,
    replies: byParent[String(root.id)] || [],
  }));
}
