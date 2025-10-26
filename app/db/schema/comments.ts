import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  youtubeCommentId: text('youtube_comment_id').notNull().unique(),
  author: text('author').notNull(),
  authorAvatar: text('author_avatar'),
  text: text('text').notNull(),
  empathicText: text('empathic_text'),
  videoTitle: text('video_title'),
  videoId: text('video_id'),
  platform: text('platform').notNull().default('youtube'),
  createdAt: timestamp('created_at').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
});
