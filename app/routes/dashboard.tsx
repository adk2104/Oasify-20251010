import { useState, useEffect } from "react";
import { Link, useSearchParams, useFetcher } from "react-router";
import type { Route } from "./+types/dashboard";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Youtube, Instagram, RefreshCw, Sparkles } from "lucide-react";
import { getSession } from "~/sessions.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId') as number;

  try {
    const origin = new URL(request.url).origin;
    const cookieHeader = request.headers.get('Cookie') || '';

    // Fetch comments from both platforms in parallel
    const [youtubeResponse, instagramResponse, providersResponse] = await Promise.all([
      fetch(`${origin}/api/youtube/comments`, { headers: { Cookie: cookieHeader } }),
      fetch(`${origin}/api/instagram/comments`, { headers: { Cookie: cookieHeader } }),
      fetch(`${origin}/api/providers`, { headers: { Cookie: cookieHeader } }),
    ]);

    const youtubeData = await youtubeResponse.json();
    const instagramData = await instagramResponse.json();
    const providersData = await providersResponse.json();

    const youtubeComments = youtubeData.comments || [];
    const instagramComments = instagramData.comments || [];

    // Combine and sort by date (most recent first)
    const allComments = [...youtubeComments, ...instagramComments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const youtubeProvider = providersData.providers?.find((p: any) => p.platform === 'youtube');
    const instagramProvider = providersData.providers?.find((p: any) => p.platform === 'instagram');

    return {
      comments: allComments,
      hasYouTubeConnection: !!youtubeProvider,
      hasInstagramConnection: !!instagramProvider,
      youtubeProvider,
      instagramProvider,
    };
  } catch (error) {
    console.error('Dashboard loader error:', error);
    return {
      comments: [],
      hasYouTubeConnection: false,
      hasInstagramConnection: false,
      youtubeProvider: null,
      instagramProvider: null,
    };
  }
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { comments, hasYouTubeConnection, hasInstagramConnection, youtubeProvider, instagramProvider } = loaderData;
  const [searchParams] = useSearchParams();
  const [globalEmpathMode, setGlobalEmpathMode] = useState(true);
  const [commentEmpathMode, setCommentEmpathMode] = useState<Record<string, boolean>>({});
  const youtubeFetcher = useFetcher();
  const instagramFetcher = useFetcher();
  const generateFetcher = useFetcher();

  const unrepliedCount = comments.filter((c: any) => !c.hasReplied).length;
  const connectedPlatform = searchParams.get('connected');
  const connectionError = searchParams.get('error');
  const isYouTubeRefreshing = youtubeFetcher.state !== 'idle';
  const isInstagramRefreshing = instagramFetcher.state !== 'idle';
  const isGenerating = generateFetcher.state !== 'idle';

  // When global toggle changes, reset all individual toggles
  useEffect(() => {
    setCommentEmpathMode({});
  }, [globalEmpathMode]);

  const toggleCommentMode = (commentId: string) => {
    setCommentEmpathMode(prev => ({
      ...prev,
      [commentId]: prev[commentId] !== undefined ? !prev[commentId] : !globalEmpathMode,
    }));
  };

  const isEmpathic = (commentId: string) => {
    return commentEmpathMode[commentId] !== undefined
      ? commentEmpathMode[commentId]
      : globalEmpathMode;
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
            <Link to="/oauth/facebook/start">
              <Button variant="outline">
                <Instagram className="w-4 h-4 mr-2" />
                Connect Instagram
              </Button>
            </Link>
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
            {comments.length} comments • {unrepliedCount} unreplied
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
        {comments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No comments yet</p>
              <p className="text-sm">Comments from your recent videos will appear here</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {comments.map((comment: any) => {
              const showEmpathic = isEmpathic(comment.id);
              const displayText = showEmpathic && comment.empathicText
                ? comment.empathicText
                : comment.text;

              return (
                <Card key={comment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {comment.authorAvatar && (
                            <img
                              src={comment.authorAvatar}
                              alt={comment.author}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="font-medium text-sm">{comment.author}</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {comment.platform}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{displayText}</p>
                        {comment.videoTitle && (
                          <p className="text-xs text-gray-500">
                            Video: {comment.videoTitle}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {comment.empathicText && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCommentMode(comment.id)}
                            className="text-xs"
                          >
                            {showEmpathic ? 'Original' : 'Empathic'}
                          </Button>
                        )}
                        {comment.hasReplied && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Replied
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
