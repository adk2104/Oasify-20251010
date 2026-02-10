import { db } from '~/db/config';
import { comments } from '~/db/schema';
import { eq, and, ilike, desc, asc, count, sql, gte, lte, isNotNull, ne } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────

export interface QueryParams {
  keyword?: string;
  videoId?: string;
  videoTitle?: string;
  platform?: 'youtube' | 'instagram';
  sentiment?: 'positive' | 'negative' | 'neutral' | 'constructive';
  startDate?: string;
  endDate?: string;
  limit?: number;
  period?: 'week' | 'month';
}

export interface QueryTemplate {
  id: string;
  description: string;
  execute: (userId: number, params: QueryParams) => Promise<unknown>;
}

// ── Parameter Validation ───────────────────────────────────────────────

function sanitizeString(value: unknown, maxLength = 200): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.slice(0, maxLength).trim();
  return cleaned || undefined;
}

function sanitizeNumber(value: unknown, min = 1, max = 500): number | undefined {
  const num = Number(value);
  if (isNaN(num)) return undefined;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

function sanitizeDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return value;
}

function sanitizePeriod(value: unknown): 'week' | 'month' | undefined {
  if (value === 'week' || value === 'month') return value;
  return undefined;
}

function sanitizePlatform(value: unknown): 'youtube' | 'instagram' | undefined {
  if (value === 'youtube' || value === 'instagram') return value;
  return undefined;
}

function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export function validateParams(raw: Record<string, unknown>): QueryParams {
  return {
    keyword: sanitizeString(raw.keyword),
    videoId: sanitizeString(raw.videoId, 50),
    videoTitle: sanitizeString(raw.videoTitle),
    platform: sanitizePlatform(raw.platform),
    limit: sanitizeNumber(raw.limit),
    startDate: sanitizeDate(raw.startDate),
    endDate: sanitizeDate(raw.endDate),
    period: sanitizePeriod(raw.period),
  };
}

// ── Query Templates ────────────────────────────────────────────────────

export const QUERY_TEMPLATES: QueryTemplate[] = [

  // 1. top_commenters
  {
    id: 'top_commenters',
    description: 'Find the most active commenters',
    execute: async (userId, params) => {
      const limit = params.limit ?? 10;
      return db
        .select({
          author: comments.author,
          commentCount: count(),
        })
        .from(comments)
        .where(and(
          eq(comments.userId, userId),
          eq(comments.isOwner, false),
        ))
        .groupBy(comments.author)
        .orderBy(desc(count()))
        .limit(limit);
    },
  },

  // 2. most_popular_videos
  {
    id: 'most_popular_videos',
    description: 'Videos that received the most comments',
    execute: async (userId, params) => {
      const limit = params.limit ?? 10;
      return db
        .select({
          videoTitle: comments.videoTitle,
          videoId: comments.videoId,
          platform: comments.platform,
          commentCount: count(),
        })
        .from(comments)
        .where(eq(comments.userId, userId))
        .groupBy(comments.videoTitle, comments.videoId, comments.platform)
        .orderBy(desc(count()))
        .limit(limit);
    },
  },

  // 3. search_comments
  {
    id: 'search_comments',
    description: 'Search for comments containing a specific keyword or phrase',
    execute: async (userId, params) => {
      const keyword = params.keyword ?? '';
      const limit = params.limit ?? 20;
      return db
        .select({
          author: comments.author,
          text: comments.text,
          sentiment: comments.sentiment,
          videoTitle: comments.videoTitle,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(and(
          eq(comments.userId, userId),
          ilike(comments.text, `%${escapeLikePattern(keyword)}%`),
        ))
        .orderBy(desc(comments.createdAt))
        .limit(limit);
    },
  },

  // 4. sentiment_breakdown
  {
    id: 'sentiment_breakdown',
    description: 'Overall sentiment distribution',
    execute: async (userId, _params) => {
      return db
        .select({
          sentiment: comments.sentiment,
          count: count(),
        })
        .from(comments)
        .where(and(
          eq(comments.userId, userId),
          isNotNull(comments.sentiment),
        ))
        .groupBy(comments.sentiment);
    },
  },

  // 5. negative_comments
  {
    id: 'negative_comments',
    description: 'Show negative or harsh comments',
    execute: async (userId, params) => {
      const limit = params.limit ?? 20;
      const conditions: ReturnType<typeof eq>[] = [
        eq(comments.userId, userId),
        eq(comments.sentiment, 'negative'),
      ];
      if (params.startDate) conditions.push(gte(comments.createdAt, new Date(params.startDate)));
      if (params.endDate) conditions.push(lte(comments.createdAt, new Date(params.endDate)));

      return db
        .select({
          author: comments.author,
          text: comments.text,
          empathicText: comments.empathicText,
          videoTitle: comments.videoTitle,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(and(...conditions))
        .orderBy(desc(comments.createdAt))
        .limit(limit);
    },
  },

  // 6. positive_comments
  {
    id: 'positive_comments',
    description: 'Show positive and supportive comments',
    execute: async (userId, params) => {
      const limit = params.limit ?? 20;
      return db
        .select({
          author: comments.author,
          text: comments.text,
          videoTitle: comments.videoTitle,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(and(
          eq(comments.userId, userId),
          eq(comments.sentiment, 'positive'),
        ))
        .orderBy(desc(comments.createdAt))
        .limit(limit);
    },
  },

  // 7. constructive_comments
  {
    id: 'constructive_comments',
    description: 'Show constructive feedback and suggestions',
    execute: async (userId, params) => {
      const limit = params.limit ?? 20;
      return db
        .select({
          author: comments.author,
          text: comments.text,
          empathicText: comments.empathicText,
          videoTitle: comments.videoTitle,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(and(
          eq(comments.userId, userId),
          eq(comments.sentiment, 'constructive'),
        ))
        .orderBy(desc(comments.createdAt))
        .limit(limit);
    },
  },

  // 8. recent_comments
  {
    id: 'recent_comments',
    description: 'Show the latest/most recent comments',
    execute: async (userId, params) => {
      const limit = params.limit ?? 20;
      return db
        .select({
          author: comments.author,
          text: comments.text,
          sentiment: comments.sentiment,
          videoTitle: comments.videoTitle,
          platform: comments.platform,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(eq(comments.userId, userId))
        .orderBy(desc(comments.createdAt))
        .limit(limit);
    },
  },

  // 9. comments_by_video
  {
    id: 'comments_by_video',
    description: 'Show all comments on a specific video',
    execute: async (userId, params) => {
      const limit = params.limit ?? 50;
      const conditions: ReturnType<typeof eq>[] = [eq(comments.userId, userId)];

      if (params.videoId) {
        conditions.push(eq(comments.videoId, params.videoId));
      } else if (params.videoTitle) {
        conditions.push(ilike(comments.videoTitle, `%${escapeLikePattern(params.videoTitle)}%`));
      }

      return db
        .select({
          author: comments.author,
          text: comments.text,
          sentiment: comments.sentiment,
          empathicText: comments.empathicText,
          createdAt: comments.createdAt,
          replyCount: comments.replyCount,
        })
        .from(comments)
        .where(and(...conditions))
        .orderBy(desc(comments.createdAt))
        .limit(limit);
    },
  },

  // 10. comment_volume_over_time
  {
    id: 'comment_volume_over_time',
    description: 'Comment trends over time by week or month',
    execute: async (userId, params) => {
      const period = params.period ?? 'week';
      // Use hardcoded sql fragments — safe because period is validated to 'week' | 'month'
      const truncFn = period === 'month'
        ? sql`date_trunc('month', ${comments.createdAt})`
        : sql`date_trunc('week', ${comments.createdAt})`;

      return db
        .select({
          period: truncFn.as('period'),
          count: count(),
        })
        .from(comments)
        .where(eq(comments.userId, userId))
        .groupBy(truncFn)
        .orderBy(asc(truncFn));
    },
  },

  // 11. reply_analysis
  {
    id: 'reply_analysis',
    description: 'Comments with the most replies/engagement',
    execute: async (userId, params) => {
      const limit = params.limit ?? 10;
      return db
        .select({
          author: comments.author,
          text: comments.text,
          replyCount: comments.replyCount,
          sentiment: comments.sentiment,
          videoTitle: comments.videoTitle,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(and(
          eq(comments.userId, userId),
          eq(comments.isReply, false),
        ))
        .orderBy(desc(comments.replyCount))
        .limit(limit);
    },
  },

  // 12. feedback_stats
  {
    id: 'feedback_stats',
    description: 'Thumbs up/down stats on AI-translated comments',
    execute: async (userId, _params) => {
      return db
        .select({
          feedback: comments.feedback,
          count: count(),
        })
        .from(comments)
        .where(and(
          eq(comments.userId, userId),
          isNotNull(comments.feedback),
        ))
        .groupBy(comments.feedback);
    },
  },

  // 13. platform_comparison
  {
    id: 'platform_comparison',
    description: 'Compare YouTube vs Instagram comment counts and sentiment',
    execute: async (userId, _params) => {
      const countsByPlatform = await db
        .select({
          platform: comments.platform,
          count: count(),
        })
        .from(comments)
        .where(eq(comments.userId, userId))
        .groupBy(comments.platform);

      const sentimentByPlatform = await db
        .select({
          platform: comments.platform,
          sentiment: comments.sentiment,
          count: count(),
        })
        .from(comments)
        .where(and(
          eq(comments.userId, userId),
          isNotNull(comments.sentiment),
        ))
        .groupBy(comments.platform, comments.sentiment);

      return { countsByPlatform, sentimentByPlatform };
    },
  },

  // 14. transformed_vs_original
  {
    id: 'transformed_vs_original',
    description: 'Compare empathic translations vs original comments',
    execute: async (userId, params) => {
      const limit = params.limit ?? 20;
      return db
        .select({
          author: comments.author,
          text: comments.text,
          empathicText: comments.empathicText,
          sentiment: comments.sentiment,
          videoTitle: comments.videoTitle,
        })
        .from(comments)
        .where(and(
          eq(comments.userId, userId),
          isNotNull(comments.empathicText),
          ne(comments.text, comments.empathicText),
        ))
        .orderBy(desc(comments.createdAt))
        .limit(limit);
    },
  },

  // 15. comprehensive_analysis
  {
    id: 'comprehensive_analysis',
    description: 'Full analysis with insights and content improvement recommendations',
    execute: async (userId, _params) => {
      const [sentiments, topVideos, recentNegative, topCommenters, totalCount] = await Promise.all([
        db.select({ sentiment: comments.sentiment, count: count() })
          .from(comments)
          .where(and(eq(comments.userId, userId), isNotNull(comments.sentiment)))
          .groupBy(comments.sentiment),

        db.select({ videoTitle: comments.videoTitle, count: count() })
          .from(comments)
          .where(eq(comments.userId, userId))
          .groupBy(comments.videoTitle)
          .orderBy(desc(count()))
          .limit(5),

        db.select({ author: comments.author, text: comments.text, videoTitle: comments.videoTitle })
          .from(comments)
          .where(and(eq(comments.userId, userId), eq(comments.sentiment, 'negative')))
          .orderBy(desc(comments.createdAt))
          .limit(10),

        db.select({ author: comments.author, count: count() })
          .from(comments)
          .where(and(eq(comments.userId, userId), eq(comments.isOwner, false)))
          .groupBy(comments.author)
          .orderBy(desc(count()))
          .limit(5),

        db.select({ count: count() })
          .from(comments)
          .where(eq(comments.userId, userId)),
      ]);

      return { sentiments, topVideos, recentNegative, topCommenters, totalComments: totalCount[0]?.count ?? 0 };
    },
  },
];

// ── Lookup helper ──────────────────────────────────────────────────────

export function getTemplate(id: string): QueryTemplate | undefined {
  return QUERY_TEMPLATES.find(t => t.id === id);
}
