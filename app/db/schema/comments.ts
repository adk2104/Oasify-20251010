import { pgTable, serial, integer, text, timestamp, pgEnum, unique, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

export const platformEnum = pgEnum('platform_enum', ['youtube', 'instagram']);

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  commentId: text('comment_id').notNull(), // Platform-specific comment ID
  youtubeCommentId: text('youtube_comment_id'), // Deprecated, kept for backward compatibility
  parentId: integer('parent_id').references((): any => comments.id, { onDelete: 'cascade' }),
  author: text('author').notNull(),
  authorAvatar: text('author_avatar'),
  text: text('text').notNull(),
  empathicText: text('empathic_text'),
  videoTitle: text('video_title'), // For YouTube: video title, For Instagram: can be null
  videoId: text('video_id'), // For YouTube: video ID, For Instagram: media ID
  platform: platformEnum('platform').notNull().default('youtube'),
  isReply: integer('is_reply').$type<boolean>().default(false).notNull(),
  replyCount: integer('reply_count').default(0).notNull(),
  isOwner: integer('is_owner').$type<boolean>().default(false).notNull(),
  createdAt: timestamp('created_at').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
}, (table) => ({
  // Composite unique constraint: same comment can exist for different users/platforms
  uniqueUserPlatformComment: unique().on(table.userId, table.commentId, table.platform),
  // Index for fast reply lookups
  commentsParentIdx: index('comments_parent_id_idx').on(table.parentId),
}));
