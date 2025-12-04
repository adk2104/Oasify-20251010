import { useState, useEffect } from "react";
import { Link, useSearchParams, useFetcher } from "react-router";
import type { Route } from "./+types/dashboard";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Youtube, Instagram, RefreshCw, Sparkles } from "lucide-react";
import { getSession } from "~/sessions.server";
import { getCommentsWithReplies } from "~/utils/comments.server";
import { db } from "~/db/config";
import { providers } from "~/db/schema";
import { eq } from "drizzle-orm";
import { CommentThread } from "~/components/CommentThread";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId') as number;

  try {
    const [commentsWithReplies, userProviders] = await Promise.all([
      getCommentsWithReplies(userId),
      db
        .select({
          id: providers.id,
          platform: providers.platform,
          platformUserId: providers.platformUserId,
          platformData: providers.platformData,
          isActive: providers.isActive,
          createdAt: providers.createdAt,
        })
        .from(providers)
        .where(eq(providers.userId, userId)),
    ]);

    const youtubeProvider = userProviders.find((p: any) => p.platform === 'youtube');
    const instagramProvider = userProviders.find((p: any) => p.platform === 'instagram');

    // Sort by most recent comment first
    const sortedComments = commentsWithReplies.sort(
      (a, b) => new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime()
    );

    return {
      commentsWithReplies: sortedComments,
      hasYouTubeConnection: !!youtubeProvider,
      hasInstagramConnection: !!instagramProvider,
      youtubeProvider,
      instagramProvider,
      userId,
      instagramOAuthUrl: process.env.INSTAGRAM_OAUTH_EMBED_URL!,
    };
  } catch (error) {
    console.error('Dashboard loader error:', error);
    return {
      commentsWithReplies: [],
      hasYouTubeConnection: false,
      hasInstagramConnection: false,
      youtubeProvider: null,
      instagramProvider: null,
      userId,
      instagramOAuthUrl: process.env.INSTAGRAM_OAUTH_EMBED_URL!,
    };
  }
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { commentsWithReplies, hasYouTubeConnection, hasInstagramConnection, youtubeProvider, instagramProvider, userId, instagramOAuthUrl } = loaderData;
  const [searchParams] = useSearchParams();
  const [globalEmpathMode, setGlobalEmpathMode] = useState(true);
  const [commentEmpathMode, setCommentEmpathMode] = useState<Record<number, boolean>>({});
  const youtubeFetcher = useFetcher();
  const instagramFetcher = useFetcher();
  const generateFetcher = useFetcher();

  const totalComments = commentsWithReplies.length;
  const connectedPlatform = searchParams.get('connected');
  const connectionError = searchParams.get('error');
  const isYouTubeRefreshing = youtubeFetcher.state !== 'idle';
  const isInstagramRefreshing = instagramFetcher.state !== 'idle';
  const isGenerating = generateFetcher.state !== 'idle';

  // When global toggle changes, reset all individual toggles
  useEffect(() => {
    setCommentEmpathMode({});
  }, [globalEmpathMode]);

  const toggleCommentMode = (commentId: number) => {
    setCommentEmpathMode(prev => ({
      ...prev,
      [commentId]: prev[commentId] !== undefined ? !prev[commentId] : !globalEmpathMode,
    }));
  };

  // Show empty state if no connections
  if (!hasYouTubeConnection && !hasInstagramConnection) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <h2 className="text-2xl font-semibold">Connect Your Social Accounts</h2>
          <p className="text-gray-600">
            Connect your YouTube and Instagram accounts to start seeing and managing comments.
          </p>
          <div className="flex gap-4 justify-center mt-6">
            <Link to="/oauth/google/start">
              <Button>
                <Youtube className="w-4 h-4 mr-2" />
                Connect YouTube
              </Button>
            </Link>
            <a href={`${instagramOAuthUrl}&state=${userId}`}>
              <Button variant="outline">
                <Instagram className="w-4 h-4 mr-2" />
                Connect Instagram
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Success/Error Messages */}
      {connectedPlatform === 'youtube' && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p className="font-medium">YouTube Connected Successfully!</p>
          <p className="text-sm">
            Connected as {youtubeProvider?.platformData?.channelTitle}
          </p>
        </div>
      )}
      {connectedPlatform === 'instagram' && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p className="font-medium">Instagram Connected Successfully!</p>
          <p className="text-sm">
            Connected as @{instagramProvider?.platformData?.instagramUsername}
          </p>
        </div>
      )}
      {connectionError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p className="font-medium">Connection Error</p>
          <p className="text-sm">Failed to connect. Please try again.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Inbox</h1>
          <p className="text-sm text-gray-500">
            {totalComments} comments
          </p>
          <div className="flex gap-4 mt-1">
            {youtubeProvider && (
              <p className="text-xs text-gray-400">
                YouTube: {youtubeProvider.platformData?.channelTitle}
              </p>
            )}
            {instagramProvider && (
              <p className="text-xs text-gray-400">
                Instagram: @{instagramProvider.platformData?.instagramUsername}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasYouTubeConnection && (
            <youtubeFetcher.Form method="post" action="/api/youtube/comments">
              <Button type="submit" variant="outline" size="sm" disabled={isYouTubeRefreshing}>
                <Youtube className={`w-4 h-4 mr-2 ${isYouTubeRefreshing ? 'animate-spin' : ''}`} />
                {isYouTubeRefreshing ? 'Syncing...' : 'Sync YouTube'}
              </Button>
            </youtubeFetcher.Form>
          )}
          {hasInstagramConnection && (
            <instagramFetcher.Form method="post" action="/api/instagram/comments">
              <Button type="submit" variant="outline" size="sm" disabled={isInstagramRefreshing}>
                <Instagram className={`w-4 h-4 mr-2 ${isInstagramRefreshing ? 'animate-spin' : ''}`} />
                {isInstagramRefreshing ? 'Syncing...' : 'Sync Instagram'}
              </Button>
            </instagramFetcher.Form>
          )}
          <generateFetcher.Form method="post" action="/api/youtube/comments?action=generate">
            <Button type="submit" variant="outline" size="sm" disabled={isGenerating}>
              <Sparkles className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-pulse' : ''}`} />
              {isGenerating ? 'Generating...' : 'Generate Empathic'}
            </Button>
          </generateFetcher.Form>
          <div className="flex items-center space-x-2">
            <Switch
              id="global-empath"
              checked={globalEmpathMode}
              onCheckedChange={setGlobalEmpathMode}
            />
            <Label htmlFor="global-empath" className="text-sm font-medium">
              Global Empath Mode
            </Label>
          </div>
        </div>
      </div>

      {/* Filters Placeholder */}
      <div className="px-4 pt-4 pb-2 bg-gray-50">
        <p className="text-sm text-gray-500">Filters coming soon...</p>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {commentsWithReplies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No comments yet</p>
              <p className="text-sm">Comments from your recent videos will appear here</p>
            </div>
          </div>
        ) : (
          <div className="p-4 divide-y divide-gray-200">
            {commentsWithReplies.map(({ comment, replies }) => (
              <CommentThread
                key={comment.id}
                comment={comment as any}
                replies={replies as any}
                depth={0}
                globalEmpathMode={globalEmpathMode}
                commentEmpathMode={commentEmpathMode}
                onToggleMode={toggleCommentMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
