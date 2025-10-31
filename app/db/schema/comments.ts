import { pgTable, serial, integer, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

const platformEnum = pgEnum('platform_enum', ['youtube', 'instagram']);

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  commentId: text('comment_id').notNull().unique(), // Platform-specific comment ID
  youtubeCommentId: text('youtube_comment_id'), // Deprecated, kept for backward compatibility
  author: text('author').notNull(),
  authorAvatar: text('author_avatar'),
  text: text('text').notNull(),
  empathicText: text('empathic_text'),
  videoTitle: text('video_title'), // For YouTube: video title, For Instagram: can be null
  videoId: text('video_id'), // For YouTube: video ID, For Instagram: media ID
  platform: platformEnum('platform').notNull().default('youtube'),
  createdAt: timestamp('created_at').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
});
