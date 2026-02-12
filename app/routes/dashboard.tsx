import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useFetcher, useRevalidator } from "react-router";
import type { Route } from "./+types/dashboard";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Modal } from "~/components/ui/modal";
import { Youtube, Instagram, RefreshCw, Sparkles, Info } from "lucide-react";
import { getSession } from "~/sessions.server";
import { getCommentsWithReplies } from "~/utils/comments.server";
import { db } from "~/db/config";
import { providers, users } from "~/db/schema";
import { eq } from "drizzle-orm";
import { CommentThread } from "~/components/CommentThread";
import { ChatPanel } from "~/components/ChatPanel";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId') as number;

  // Fetch user settings
  const userSettings = await db
    .select({ hideOriginalToggle: users.hideOriginalToggle })
    .from(users)
    .where(eq(users.id, userId))
    .then(rows => rows[0] || { hideOriginalToggle: false });

  // Fetch providers first (this should rarely fail)
  const userProviders = await db
    .select({
      id: providers.id,
      platform: providers.platform,
      platformUserId: providers.platformUserId,
      platformData: providers.platformData,
      isActive: providers.isActive,
      createdAt: providers.createdAt,
    })
    .from(providers)
    .where(eq(providers.userId, userId));

  const youtubeProvider = userProviders.find((p: any) => p.platform === 'youtube');
  const instagramProvider = userProviders.find((p: any) => p.platform === 'instagram');

  // Fetch comments separately so provider status isn't affected by comment errors
  let commentsWithReplies: Awaited<ReturnType<typeof getCommentsWithReplies>> = [];
  try {
    commentsWithReplies = await getCommentsWithReplies(userId);
    // Sort by most recent comment first
    commentsWithReplies.sort(
      (a, b) => new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching comments:', error);
    // Comments failed but we still show the dashboard with provider info
  }

  return {
    commentsWithReplies,
    hasYouTubeConnection: !!youtubeProvider,
    hasInstagramConnection: !!instagramProvider,
    youtubeProvider,
    instagramProvider,
    userId,
    instagramOAuthUrl: process.env.INSTAGRAM_OAUTH_EMBED_URL!,
    hideOriginalToggle: userSettings.hideOriginalToggle,
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { commentsWithReplies, hasYouTubeConnection, hasInstagramConnection, youtubeProvider, instagramProvider, userId, instagramOAuthUrl, hideOriginalToggle } = loaderData;
  const [searchParams] = useSearchParams();
  const [globalEmpathMode, setGlobalEmpathMode] = useState(true);
  const [commentEmpathMode, setCommentEmpathMode] = useState<Record<number, boolean>>({});
  const youtubeFetcher = useFetcher();
  const instagramFetcher = useFetcher();
  const generateFetcher = useFetcher();
  const revalidator = useRevalidator();

  // Polling state for live comment updates
  const [preExistingIds, setPreExistingIds] = useState<Set<number>>(new Set());
  const [newCommentIds, setNewCommentIds] = useState<Set<number>>(new Set());
  const [fadingCommentIds, setFadingCommentIds] = useState<Set<number>>(new Set());
  const [isPolling, setIsPolling] = useState(false);
  const [hasCapturedInitialState, setHasCapturedInitialState] = useState(false);

  // Sync progress state
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // First-sync popup state
  const [showFirstSyncPopup, setShowFirstSyncPopup] = useState(false);
  const [hasSeenFirstSyncPopup, setHasSeenFirstSyncPopup] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('oasify-first-sync-seen') === 'true';
    }
    return false;
  });

  const totalComments = commentsWithReplies.length;
  const connectedPlatform = searchParams.get('connected');
  const connectionError = searchParams.get('error');
  const isYouTubeRefreshing = youtubeFetcher.state !== 'idle';
  const isInstagramRefreshing = instagramFetcher.state !== 'idle';
  const isGenerating = generateFetcher.state !== 'idle';
  const isSyncingAny = isSyncing || isYouTubeRefreshing || isInstagramRefreshing;

  const handleSyncAll = () => {
    if (isSyncing) return;

    // Show first-sync popup if this is the first time
    if (!hasSeenFirstSyncPopup && commentsWithReplies.length === 0) {
      setShowFirstSyncPopup(true);
    }

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0 });
    setSyncStatus('Connecting...');

    // Capture existing comment IDs for highlighting new ones
    const existingIds = new Set(commentsWithReplies.map(c => c.comment.id));
    setPreExistingIds(existingIds);
    setNewCommentIds(new Set());
    setHasCapturedInitialState(true);
    setIsPolling(true);

    const eventSource = new EventSource('/api/sync');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'total') {
          setSyncProgress(prev => ({ ...prev, total: data.total }));
        } else if (data.type === 'status') {
          setSyncStatus(data.message);
        } else if (data.type === 'progress') {
          setSyncProgress({ current: data.current, total: data.total });
        } else if (data.type === 'done') {
          setSyncProgress({ current: data.current, total: data.total });
          setSyncStatus('Sync complete!');
          eventSource.close();
          eventSourceRef.current = null;
          setIsSyncing(false);
          setIsPolling(false);
          revalidator.revalidate();
        } else if (data.type === 'error') {
          setSyncStatus(`Error: ${data.message}`);
          eventSource.close();
          eventSourceRef.current = null;
          setIsSyncing(false);
          setIsPolling(false);
        }
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    };

    eventSource.onerror = () => {
      setSyncStatus('Connection lost');
      eventSource.close();
      eventSourceRef.current = null;
      setIsSyncing(false);
      setIsPolling(false);
    };
  };

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // When global toggle changes, reset all individual toggles
  useEffect(() => {
    setCommentEmpathMode({});
  }, [globalEmpathMode]);

  // Auto-sync when a platform is just connected
  // 🎉 Fresh connection celebration! Kick off the SSE-based sync so they see the progress bar
  useEffect(() => {
    if (connectedPlatform && (hasYouTubeConnection || hasInstagramConnection)) {
      handleSyncAll();
    }
  }, [connectedPlatform]);

  // Polling interval - revalidate every 3 seconds to show new comments as they're saved
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(() => {
      revalidator.revalidate();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isPolling, isSyncing, revalidator]);

  // Detect new comments after each revalidation
  useEffect(() => {
    if (!isPolling || !hasCapturedInitialState) return;

    const newIds = new Set<number>();
    const allCurrentIds = new Set<number>();
    
    commentsWithReplies.forEach(({ comment, replies }) => {
      allCurrentIds.add(comment.id);
      if (!preExistingIds.has(comment.id)) {
        newIds.add(comment.id);
      }
      // Check replies recursively
      const checkReplies = (repliesList: typeof replies) => {
        repliesList.forEach(({ comment: replyComment, replies: nestedReplies }) => {
          allCurrentIds.add(replyComment.id);
          if (!preExistingIds.has(replyComment.id)) {
            newIds.add(replyComment.id);
          }
          checkReplies(nestedReplies);
        });
      };
      checkReplies(replies);
    });

    if (newIds.size > 0) {
      // Update preExistingIds so these comments aren't detected as new again
      setPreExistingIds(allCurrentIds);
      
      setNewCommentIds(prev => new Set([...prev, ...newIds]));

      // Schedule individual 2s fade for each new comment
      newIds.forEach(id => {
        setTimeout(() => {
          setNewCommentIds(prev => {
            const updated = new Set(prev);
            updated.delete(id);
            return updated;
          });
          setFadingCommentIds(prev => new Set([...prev, id]));
        }, 2000);
      });
    }
  }, [commentsWithReplies, isPolling, preExistingIds, hasCapturedInitialState]);

  // Clear fading comments after transition completes
  useEffect(() => {
    if (fadingCommentIds.size === 0) return;
    const t = setTimeout(() => setFadingCommentIds(new Set()), 500);
    return () => clearTimeout(t);
  }, [fadingCommentIds.size]);

  const toggleCommentMode = (commentId: number) => {
    setCommentEmpathMode(prev => ({
      ...prev,
      [commentId]: prev[commentId] !== undefined ? !prev[commentId] : !globalEmpathMode,
    }));
  };

  const handleDismissFirstSyncPopup = () => {
    setShowFirstSyncPopup(false);
    setHasSeenFirstSyncPopup(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('oasify-first-sync-seen', 'true');
    }
  };

  // Show empty state only if no connections AND no existing comments
  if (!hasYouTubeConnection && !hasInstagramConnection && commentsWithReplies.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center max-w-md space-y-6">
          <div className="w-20 h-20 bg-oasis-100 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-10 h-10 text-oasis-500" />
          </div>
          <h2 className="text-2xl font-semibold text-warm-800">Connect Your Social Accounts</h2>
          <p className="text-warm-500">
            Connect your YouTube and Instagram accounts to start seeing and managing comments with peace of mind.
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
      {/* First Sync Popup Modal */}
      <Modal isOpen={showFirstSyncPopup} onClose={handleDismissFirstSyncPopup}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-oasis-100 rounded-full flex items-center justify-center mx-auto">
            <Info className="w-8 h-8 text-oasis-500" />
          </div>
          <h2 className="text-xl font-semibold text-warm-800">
            First Sync in Progress
          </h2>
          <p className="text-warm-500">
            Please be aware that the first time syncing takes longer as we process your comments. 
            Sit back and relax while we set up your oasis! 🌴
          </p>
          <Button
            onClick={handleDismissFirstSyncPopup}
            className="w-full"
          >
            Got it, thanks!
          </Button>
        </div>
      </Modal>

      {/* Success/Error Messages */}
      {connectedPlatform === 'youtube' && (
        <div className="bg-calm-50 border-l-4 border-calm-400 text-calm-700 p-4">
          <p className="font-medium">YouTube Connected Successfully!</p>
          <p className="text-sm">
            Connected as {youtubeProvider?.platformData?.channelTitle}
          </p>
        </div>
      )}
      {connectedPlatform === 'instagram' && (
        <div className="bg-calm-50 border-l-4 border-calm-400 text-calm-700 p-4">
          <p className="font-medium">Instagram Connected Successfully!</p>
          <p className="text-sm">
            Connected as @{instagramProvider?.platformData?.instagramUsername}
          </p>
        </div>
      )}
      {connectionError && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4">
          <p className="font-medium">Connection Error</p>
          <p className="text-sm">Failed to connect. Please try again.</p>
        </div>
      )}
      {!hasYouTubeConnection && !hasInstagramConnection && commentsWithReplies.length > 0 && (
        <div className="bg-oasis-50 border-l-4 border-oasis-300 text-oasis-800 p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">No accounts connected</p>
            <p className="text-sm">Connect your accounts to sync new comments</p>
          </div>
          <div className="flex gap-2">
            <Link to="/oauth/google/start">
              <Button size="sm">
                <Youtube className="w-4 h-4 mr-2" />
                Connect YouTube
              </Button>
            </Link>
            <a href={`${instagramOAuthUrl}&state=${userId}`}>
              <Button size="sm" variant="outline">
                <Instagram className="w-4 h-4 mr-2" />
                Connect Instagram
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-oasis-100 bg-white/80 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-semibold text-warm-800">Inbox</h1>
          <p className="text-sm text-warm-500">
            {totalComments} comments
          </p>
          <div className="flex gap-4 mt-1">
            {youtubeProvider && (
              <p className="text-xs text-warm-400">
                YouTube: {youtubeProvider.platformData?.channelTitle}
              </p>
            )}
            {instagramProvider && (
              <p className="text-xs text-warm-400">
                Instagram: @{instagramProvider.platformData?.instagramUsername}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {(hasYouTubeConnection || hasInstagramConnection) && (
            <div className="flex items-center gap-3">
              {isSyncing && (
                <div className="flex items-center gap-2 min-w-[200px]">
                  {syncProgress.total === 0 ? (
                    <span className="text-xs text-warm-500 animate-pulse">
                      {syncStatus || 'Fetching comments...'}
                    </span>
                  ) : (
                    <>
                      <Progress
                        value={(syncProgress.current / syncProgress.total) * 100}
                        max={100}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {syncProgress.current}/{syncProgress.total}
                      </span>
                    </>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSyncAll}
                  disabled={isSyncingAny}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingAny ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync All'}
                </Button>
                {commentsWithReplies.length === 0 && (
                  <span className="text-xs text-warm-400">
                    First sync can take up to 3 minutes
                  </span>
                )}
              </div>
            </div>
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
      <div className="px-4 pt-4 pb-2 bg-oasis-50/50">
        <p className="text-sm text-warm-400">Filters coming soon...</p>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-auto bg-gradient-to-b from-oasis-50/50 to-white">
        {commentsWithReplies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-warm-500">
              <p className="text-lg font-medium">No comments yet</p>
              <p className="text-sm">Comments from your recent videos will appear here</p>
            </div>
          </div>
        ) : (
          <div className="p-4 divide-y divide-oasis-100">
            {commentsWithReplies.map(({ comment, replies }) => (
              <CommentThread
                key={comment.id}
                comment={comment as any}
                replies={replies as any}
                depth={0}
                globalEmpathMode={globalEmpathMode}
                commentEmpathMode={commentEmpathMode}
                onToggleMode={toggleCommentMode}
                newCommentIds={newCommentIds}
                fadingCommentIds={fadingCommentIds}
                hideOriginalToggle={hideOriginalToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Analytics Chat */}
      <ChatPanel />
    </div>
  );
}
