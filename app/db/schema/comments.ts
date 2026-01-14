import { pgTable, serial, integer, text, timestamp, pgEnum, unique, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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
  videoThumbnail: text('video_thumbnail'), // Stores thumbnail URL for both platforms
  videoPermalink: text('video_permalink'), // Stores Instagram permalink (null for YouTube)
  platform: platformEnum('platform').notNull().default('youtube'),
  isReply: boolean('is_reply').default(false).notNull(),
  replyCount: integer('reply_count').default(0).notNull(),
  isOwner: boolean('is_owner').default(false).notNull(),
  feedback: text('feedback'), // 'up' | 'down' | null
  feedbackAt: timestamp('feedback_at'),
  createdAt: timestamp('created_at').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
}, (table) => ({
  // Composite unique constraint: same comment can exist for different users/platforms
  uniqueUserPlatformComment: unique().on(table.userId, table.commentId, table.platform),
  // Index for fast reply lookups
  commentsParentIdx: index('comments_parent_id_idx').on(table.parentId),
}));
