import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const providers = pgTable('providers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(), // 'youtube' | 'instagram'
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  scopes: text('scopes').array().notNull(),
  platformUserId: text('platform_user_id').notNull(), // YouTube channel ID
  platformData: jsonb('platform_data').$type<{
    channelTitle?: string;
    channelThumbnail?: string;
    [key: string]: any;
  }>(), // Channel info and other platform-specific data
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
