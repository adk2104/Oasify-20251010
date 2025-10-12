import type { Route } from './+types/api.youtube.comments';
import { getSession } from '~/sessions.server';
import { fetchYouTubeComments } from '~/utils/youtube.server';

// GET /api/youtube/comments - Fetch fresh comments from YouTube
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userId = session.get('userId') as number;

  try {
    const comments = await fetchYouTubeComments(userId);
    return Response.json({ comments });
  } catch (error) {
    // If it's a "provider not found" error, return empty array (expected when not connected)
    if (error instanceof Error && error.message.includes('provider not found')) {
      return Response.json({ comments: [] });
    }

    // Log unexpected errors
    console.error('Fetch YouTube comments error:', error);
    throw new Response('Failed to fetch comments', { status: 500 });
  }
}
