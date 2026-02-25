import { useState } from 'react';
import { ChevronDown, ChevronRight, Youtube, Instagram } from 'lucide-react';
import { cn } from '~/lib/utils';
import { CommentThread } from '~/components/CommentThread';
import type { CommentWithReplies } from '~/utils/comments.server';

type VideoGroupProps = {
  videoId: string;
  videoTitle: string;
  videoThumbnail: string | null;
  videoPermalink: string | null;
  platform: 'youtube' | 'instagram';
  comments: CommentWithReplies[];
  totalComments: number;
  globalEmpathMode: boolean;
  commentEmpathMode: Record<number, boolean>;
  onToggleMode: (commentId: number) => void;
  newCommentIds?: Set<number>;
  fadingCommentIds?: Set<number>;
  hideOriginalToggle?: boolean;
};

export function VideoGroup({
  videoId,
  videoTitle,
  videoThumbnail,
  videoPermalink,
  platform,
  comments,
  totalComments,
  globalEmpathMode,
  commentEmpathMode,
  onToggleMode,
  newCommentIds,
  fadingCommentIds,
  hideOriginalToggle,
}: VideoGroupProps) {
  const [expanded, setExpanded] = useState(false);

  const videoUrl =
    platform === 'youtube' && videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : videoPermalink;

  const PlatformIcon = platform === 'youtube' ? Youtube : Instagram;

  return (
    <div className="border border-oasis-100 rounded-lg bg-white">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-oasis-50/50 transition-colors rounded-lg text-left"
      >
        {/* Thumbnail */}
        {videoThumbnail ? (
          <img
            src={videoThumbnail}
            alt={videoTitle}
            className="w-12 h-12 object-cover rounded shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center shrink-0">
            <PlatformIcon className="w-5 h-5 text-gray-400" />
          </div>
        )}

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-warm-800 truncate">{videoTitle}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <PlatformIcon className="w-3 h-3 text-warm-400" />
            <span className="text-xs text-warm-400">
              {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
            </span>
          </div>
        </div>

        {/* Chevron */}
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-warm-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-warm-400 shrink-0" />
        )}
      </button>

      {/* Expanded comments */}
      {expanded && (
        <div className="border-t border-oasis-100 p-4 divide-y divide-oasis-100">
          {comments.map(({ comment, replies }) => (
            <CommentThread
              key={comment.id}
              comment={comment as any}
              replies={replies as any}
              depth={0}
              globalEmpathMode={globalEmpathMode}
              commentEmpathMode={commentEmpathMode}
              onToggleMode={onToggleMode}
              newCommentIds={newCommentIds}
              fadingCommentIds={fadingCommentIds}
              hideOriginalToggle={hideOriginalToggle}
            />
          ))}
          {videoUrl && (
            <div className="pt-3">
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-oasis-600 hover:text-oasis-700 hover:underline"
              >
                View on {platform === 'youtube' ? 'YouTube' : 'Instagram'}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
