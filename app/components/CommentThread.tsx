import { useState, useEffect } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Switch } from '~/components/ui/switch';
import { cn } from '~/lib/utils';
import type { CommentWithReplies } from '~/utils/comments.server';

// Generate a consistent color based on a string (username)
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Generate a hue between 0-360, with good saturation and lightness
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
}

type Comment = {
  id: number;
  commentId: string;
  author: string;
  authorAvatar: string | null;
  text: string;
  empathicText: string | null;
  platform: 'youtube' | 'instagram';
  videoTitle: string | null;
  videoId: string | null;
  videoThumbnail: string | null;
  videoPermalink: string | null;
  isOwner: boolean;
  replyCount: number;
  feedback: 'up' | 'down' | null;
  createdAt: Date;
};

type CommentThreadProps = {
  comment: Comment;
  replies: CommentWithReplies[]; // Support nested structure
  depth: number;
  globalEmpathMode: boolean;
  commentEmpathMode: Record<number, boolean>;
  onToggleMode: (commentId: number) => void;
  newCommentIds?: Set<number>;
  fadingCommentIds?: Set<number>;
};

// Helper to construct video/post URL
function getVideoUrl(comment: Comment): string | null {
  if (comment.platform === 'youtube' && comment.videoId) {
    return `https://www.youtube.com/watch?v=${comment.videoId}`;
  }
  if (comment.platform === 'instagram' && comment.videoPermalink) {
    return comment.videoPermalink;
  }
  return null;
}

export function CommentThread({
  comment,
  replies,
  depth,
  globalEmpathMode,
  commentEmpathMode,
  onToggleMode,
  newCommentIds,
  fadingCommentIds,
}: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(replies.length <= 2);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [optimisticReplies, setOptimisticReplies] = useState<any[]>([]);
  const [optimisticFeedback, setOptimisticFeedback] = useState<'up' | 'down' | null | undefined>(undefined);
  const fetcher = useFetcher();
  const feedbackFetcher = useFetcher();
  const revalidator = useRevalidator();

  // Use optimistic feedback if set, otherwise use comment's actual feedback
  const currentFeedback = optimisticFeedback !== undefined ? optimisticFeedback : comment.feedback;

  // Check if this comment has a transformation (empathicText different from original)
  const hasTransformation = !comment.isOwner && comment.empathicText && comment.empathicText !== comment.text;

  const handleFeedback = (type: 'up' | 'down') => {
    // Toggle off if clicking same feedback, otherwise set new feedback
    const newFeedback = currentFeedback === type ? null : type;
    setOptimisticFeedback(newFeedback);

    const formData = new FormData();
    formData.append('commentId', comment.id.toString());
    formData.append('feedback', newFeedback || '');

    feedbackFetcher.submit(formData, {
      method: 'POST',
      action: '/api/comments/feedback',
    });
  };

  const isEmpathMode = commentEmpathMode[comment.id] ?? globalEmpathMode;
  const displayText = isEmpathMode && comment.empathicText && !comment.isOwner
    ? comment.empathicText
    : (comment.text || '');

  const marginLeftClass = depth === 0 ? '' : depth === 1 ? 'ml-4' : 'ml-8';
  const textSizeClass = depth === 0 ? 'text-sm' : depth === 1 ? 'text-xs' : 'text-[11px]';

  const videoUrl = depth === 0 ? getVideoUrl(comment) : null;
  // Show thumbnail section if we have a videoId (even without thumbnail URL) or if we have a title
  const shouldShowThumbnailSection = depth === 0 && (comment.videoId || comment.videoTitle);

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;

    const tempId = `temp-${Date.now()}`;
    setOptimisticReplies(prev => [
      ...prev,
      {
        id: tempId,
        author: 'You',
        text: replyText,
        status: 'sending',
        createdAt: new Date(),
      },
    ]);

    const formData = new FormData();
    formData.append('platform', comment.platform);
    formData.append('parentCommentId', comment.commentId);
    formData.append('replyText', replyText);

    fetcher.submit(formData, {
      method: 'POST',
      action: '/api/comments/reply',
    });

    setReplyText('');
    setShowReplyBox(false);
    setShowReplies(true);
  };

  // Trigger revalidation when reply is successfully posted
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  // Clear optimistic UI only after revalidation completes
  useEffect(() => {
    if (revalidator.state === 'idle' && optimisticReplies.length > 0) {
      // Small delay to ensure loader data is processed
      const timer = setTimeout(() => {
        setOptimisticReplies([]);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [revalidator.state, optimisticReplies.length]);

  const allReplies = [...replies, ...optimisticReplies];
  const totalReplies = allReplies.length;

  // Check if this comment should be highlighted as new or fading
  const isNewComment = newCommentIds?.has(comment.id) ?? false;
  const isFading = fadingCommentIds?.has(comment.id) ?? false;

  return (
    <div className={cn(
      'py-3 transition-all duration-500',
      marginLeftClass,
      (isNewComment || isFading) && 'border-2 rounded-lg px-3 -mx-3',
      isNewComment && 'border-emerald-400 bg-emerald-50',
      isFading && 'border-transparent bg-transparent'
    )}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {comment.authorAvatar ? (
            <AvatarImage src={comment.authorAvatar} />
          ) : (
            <AvatarFallback
              className="text-white font-semibold text-sm"
              style={{ backgroundColor: getAvatarColor(comment.author || 'Unknown') }}
            >
              {comment.author?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          )}
        </Avatar>
        <div className={cn('flex-1 min-w-0', shouldShowThumbnailSection ? 'max-w-[70%]' : '')}>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('font-medium', textSizeClass)}>{comment.author || 'Unknown'}</span>
            <span className="text-[10px] text-muted-foreground">
              {comment.platform === 'youtube' ? 'YouTube' : 'Instagram'} • {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
            </span>
            {Boolean(comment.isOwner) && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                You
              </span>
            )}
            {!comment.isOwner && comment.empathicText && (
              <>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground">
                  {isEmpathMode ? 'Empathic' : 'Original'}
                </span>
                <Switch
                  checked={isEmpathMode}
                  onCheckedChange={() => onToggleMode(comment.id)}
                  className="scale-75"
                />
              </>
            )}
            {hasTransformation && (
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={() => handleFeedback('up')}
                  className={cn(
                    "p-1 rounded hover:bg-green-100 transition-colors",
                    currentFeedback === 'up' && "bg-green-100 text-green-600"
                  )}
                  title="Good transformation"
                >
                  <svg className="w-3.5 h-3.5" fill={currentFeedback === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                </button>
                <button
                  onClick={() => handleFeedback('down')}
                  className={cn(
                    "p-1 rounded hover:bg-red-100 transition-colors",
                    currentFeedback === 'down' && "bg-red-100 text-red-600"
                  )}
                  title="Bad transformation"
                >
                  <svg className="w-3.5 h-3.5" fill={currentFeedback === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <p className={cn('text-foreground/90 whitespace-pre-wrap', textSizeClass)}>
            {displayText}
          </p>
          {depth < 2 && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyBox(!showReplyBox)}
                className="h-6 text-xs"
              >
                Reply
              </Button>
            </div>
          )}

          {showReplyBox && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="text-sm min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={!replyText.trim() || fetcher.state !== 'idle'}
                >
                  {fetcher.state !== 'idle' ? 'Posting...' : 'Post'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReplyBox(false);
                    setReplyText('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {totalReplies > 0 && (
            <div className="mt-3">
              {!showReplies ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplies(true)}
                  className="h-6 text-xs text-primary"
                >
                  View replies ({totalReplies})
                </Button>
              ) : (
                <div className="space-y-1">
                  {allReplies.map((reply) => {
                    // Handle optimistic UI (sending state)
                    if (reply.status === 'sending') {
                      return (
                        <div key={reply.id} className="py-2 opacity-50">
                          <div className="flex gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback
                                className="text-white font-semibold text-xs"
                                style={{ backgroundColor: getAvatarColor('You') }}
                              >
                                Y
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="text-xs font-medium">You</div>
                              <p className="text-xs text-foreground/70">{reply.text}</p>
                              <span className="text-[10px] text-muted-foreground">
                                Sending...
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Handle nested structure from server
                    const replyComment = reply.comment || reply; // Support both structures
                    const nestedReplies = reply.replies || [];

                    return (
                      <CommentThread
                        key={replyComment.id}
                        comment={replyComment as Comment}
                        replies={nestedReplies}
                        depth={depth + 1}
                        globalEmpathMode={globalEmpathMode}
                        commentEmpathMode={commentEmpathMode}
                        onToggleMode={onToggleMode}
                        newCommentIds={newCommentIds}
                        fadingCommentIds={fadingCommentIds}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thumbnail on right side (top-level only) */}
        {shouldShowThumbnailSection && (
          <div className="shrink-0 flex flex-col gap-1 w-24">
            {comment.videoThumbnail ? (
              <a
                href={videoUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                title={`View on ${comment.platform === 'youtube' ? 'YouTube' : 'Instagram'}`}
                className={videoUrl ? '' : 'pointer-events-none'}
              >
                <img
                  src={comment.videoThumbnail}
                  alt={comment.videoTitle || 'Post thumbnail'}
                  className="w-24 h-24 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </a>
            ) : (
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {comment.videoTitle && (
              <p className="text-xs text-muted-foreground line-clamp-2 w-24">
                {comment.videoTitle}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
