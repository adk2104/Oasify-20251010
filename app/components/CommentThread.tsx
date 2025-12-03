import { useState } from 'react';
import { useFetcher } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';

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
  isOwner: number;
  replyCount: number;
  createdAt: Date;
};

type CommentThreadProps = {
  comment: Comment;
  replies: Comment[];
  depth: number;
  globalEmpathMode: boolean;
  commentEmpathMode: Record<number, boolean>;
  onToggleMode: (commentId: number) => void;
};

export function CommentThread({
  comment,
  replies,
  depth,
  globalEmpathMode,
  commentEmpathMode,
  onToggleMode,
}: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(replies.length <= 2);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [optimisticReplies, setOptimisticReplies] = useState<any[]>([]);
  const fetcher = useFetcher();

  const isEmpathMode = commentEmpathMode[comment.id] ?? globalEmpathMode;
  const displayText = isEmpathMode && comment.empathicText && !comment.isOwner
    ? comment.empathicText
    : comment.text;

  const marginLeftClass = depth === 0 ? '' : depth === 1 ? 'ml-4' : 'ml-8';
  const textSizeClass = depth === 0 ? 'text-sm' : depth === 1 ? 'text-xs' : 'text-[11px]';

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

  // Remove optimistic reply when real reply comes back
  if (fetcher.state === 'idle' && fetcher.data?.success && optimisticReplies.length > 0) {
    setOptimisticReplies([]);
  }

  const allReplies = [...replies, ...optimisticReplies];
  const totalReplies = allReplies.length;

  return (
    <div className={cn('py-3', marginLeftClass)}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.authorAvatar || undefined} />
          <AvatarFallback>{comment.author[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('font-medium', textSizeClass)}>{comment.author}</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
            {comment.isOwner && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                You
              </span>
            )}
          </div>
          <p className={cn('text-foreground/90 whitespace-pre-wrap', textSizeClass)}>
            {displayText}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {!comment.isOwner && comment.empathicText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleMode(comment.id)}
                className="h-6 text-xs"
              >
                {isEmpathMode ? 'Original' : 'Empathic'}
              </Button>
            )}
            {depth < 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyBox(!showReplyBox)}
                className="h-6 text-xs"
              >
                Reply
              </Button>
            )}
          </div>

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
                    if (reply.status === 'sending') {
                      return (
                        <div key={reply.id} className="py-2 opacity-50">
                          <div className="flex gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>Y</AvatarFallback>
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
                    return (
                      <CommentThread
                        key={reply.id}
                        comment={reply}
                        replies={[]}
                        depth={depth + 1}
                        globalEmpathMode={globalEmpathMode}
                        commentEmpathMode={commentEmpathMode}
                        onToggleMode={onToggleMode}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
