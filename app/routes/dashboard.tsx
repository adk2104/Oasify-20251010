import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/dashboard";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Youtube } from "lucide-react";
import { getSession } from "~/sessions.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId') as number;

  try {
    // Fetch YouTube comments
    const commentsResponse = await fetch(`${new URL(request.url).origin}/api/youtube/comments`, {
      headers: { Cookie: request.headers.get('Cookie') || '' }
    });

    const commentsData = await commentsResponse.json();
    const comments = commentsData.comments || [];

    // Fetch providers to check connection status
    const providersResponse = await fetch(`${new URL(request.url).origin}/api/providers`, {
      headers: { Cookie: request.headers.get('Cookie') || '' }
    });

    const providersData = await providersResponse.json();
    const youtubeProvider = providersData.providers?.find((p: any) => p.platform === 'youtube');

    return {
      comments,
      hasYouTubeConnection: !!youtubeProvider,
      youtubeProvider,
    };
  } catch (error) {
    console.error('Dashboard loader error:', error);
    return {
      comments: [],
      hasYouTubeConnection: false,
      youtubeProvider: null,
    };
  }
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { comments, hasYouTubeConnection, youtubeProvider } = loaderData;
  const [searchParams] = useSearchParams();
  const [globalEmpathMode, setGlobalEmpathMode] = useState(true);

  const unrepliedCount = comments.filter((c: any) => !c.hasReplied).length;
  const connectionSuccess = searchParams.get('connected') === 'youtube';
  const connectionError = searchParams.get('error');

  // Show empty state if no YouTube connection
  if (!hasYouTubeConnection) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <Youtube className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-semibold">Connect Your YouTube Channel</h2>
          <p className="text-gray-600">
            Connect your YouTube account to start seeing and managing comments from your videos.
          </p>
          <Link to="/oauth/google/start">
            <Button className="mt-4">
              <Youtube className="w-4 h-4 mr-2" />
              Connect YouTube
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Success/Error Messages */}
      {connectionSuccess && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p className="font-medium">YouTube Connected Successfully!</p>
          <p className="text-sm">
            Connected as {youtubeProvider?.platformData?.channelTitle}
          </p>
        </div>
      )}
      {connectionError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p className="font-medium">Connection Error</p>
          <p className="text-sm">Failed to connect YouTube. Please try again.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Inbox</h1>
          <p className="text-sm text-gray-500">
            {comments.length} comments • {unrepliedCount} unreplied
          </p>
          {youtubeProvider && (
            <p className="text-xs text-gray-400 mt-1">
              YouTube: {youtubeProvider.platformData?.channelTitle}
            </p>
          )}
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
            {comments.map((comment: any) => (
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
                      <p className="text-sm text-gray-700 mb-1">{comment.text}</p>
                      {comment.videoTitle && (
                        <p className="text-xs text-gray-500">
                          Video: {comment.videoTitle}
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
