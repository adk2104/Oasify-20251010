import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/dashboard";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Youtube, Instagram } from "lucide-react";
import { getSession } from "~/sessions.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId') as number;

  try {
    const origin = new URL(request.url).origin;
    const headers = { Cookie: request.headers.get('Cookie') || '' };

    // Fetch both YouTube and Instagram comments in parallel
    const [youtubeResponse, instagramResponse, providersResponse] = await Promise.all([
      fetch(`${origin}/api/youtube/comments`, { headers }),
      fetch(`${origin}/api/instagram/comments`, { headers }),
      fetch(`${origin}/api/providers`, { headers }),
    ]);

    const youtubeData = await youtubeResponse.json();
    const instagramData = await instagramResponse.json();
    const providersData = await providersResponse.json();

    // Merge comments from both platforms
    const allComments = [
      ...(youtubeData.comments || []),
      ...(instagramData.comments || []),
    ];

    // Sort by most recent first
    allComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  const unrepliedCount = comments.filter((c: any) => !c.hasReplied).length;
  const connectedPlatform = searchParams.get('connected');
  const connectionError = searchParams.get('error');

  // Show empty state if no connections
  if (!hasYouTubeConnection && !hasInstagramConnection) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <h2 className="text-2xl font-semibold">Connect Your Accounts</h2>
          <p className="text-gray-600">
            Connect your YouTube or Instagram account to start seeing and managing comments.
          </p>
          <div className="flex gap-4 justify-center mt-6">
            <Link to="/oauth/google/start">
              <Button className="bg-red-600 hover:bg-red-700">
                <Youtube className="w-4 h-4 mr-2" />
                Connect YouTube
              </Button>
            </Link>
            <Link to="/oauth/instagram/start">
              <Button className="bg-pink-600 hover:bg-pink-700">
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
            Connected as @{instagramProvider?.platformData?.username}
          </p>
        </div>
      )}
      {connectionError === 'oauth_failed' && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p className="font-medium">Connection Error</p>
          <p className="text-sm">Failed to connect. Please try again.</p>
        </div>
      )}
      {connectionError === 'no_instagram_account' && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p className="font-medium">No Instagram Business Account Found</p>
          <p className="text-sm">Please ensure your Instagram account is connected to a Facebook page and set up as a Business or Creator account.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Inbox</h1>
          <p className="text-sm text-gray-500">
            {comments.length} comments • {unrepliedCount} unreplied
          </p>
          <div className="flex gap-3 mt-1">
            {youtubeProvider && (
              <p className="text-xs text-gray-400">
                <Youtube className="w-3 h-3 inline mr-1" />
                {youtubeProvider.platformData?.channelTitle}
              </p>
            )}
            {instagramProvider && (
              <p className="text-xs text-gray-400">
                <Instagram className="w-3 h-3 inline mr-1" />
                @{instagramProvider.platformData?.username}
              </p>
            )}
          </div>
        </div>
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

      {/* Comments List */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {comments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No comments yet</p>
              <p className="text-sm">Comments from your videos and posts will appear here</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {comments.map((comment: any) => (
              <Card key={comment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          comment.platform === 'youtube'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-pink-100 text-pink-700'
                        }`}>
                          {comment.platform === 'youtube' ? (
                            <><Youtube className="w-3 h-3 inline mr-1" />YouTube</>
                          ) : (
                            <><Instagram className="w-3 h-3 inline mr-1" />Instagram</>
                          )}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{comment.text}</p>
                      {comment.platform === 'youtube' && comment.videoTitle && (
                        <p className="text-xs text-gray-500">
                          Video: {comment.videoTitle}
                        </p>
                      )}
                      {comment.platform === 'instagram' && comment.postCaption && (
                        <p className="text-xs text-gray-500">
                          Post: {comment.postCaption}
                        </p>
                      )}
                    </div>
                    {comment.hasReplied && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Replied
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
