import type { Route } from './+types/api.instagram.comments';
import { getSession } from '~/sessions.server';
import { fetchInstagramComments } from '~/utils/instagram.server';

// GET /api/instagram/comments - Fetch fresh comments from Instagram
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userId = session.get('userId') as number;

  try {
    const comments = await fetchInstagramComments(userId);
    return Response.json({ comments });
  } catch (error) {
    // If it's a "provider not found" error, return empty array (expected when not connected)
    if (error instanceof Error && error.message.includes('provider not found')) {
      return Response.json({ comments: [] });
    }

    // Log unexpected errors
    console.error('Fetch Instagram comments error:', error);
    throw new Response('Failed to fetch comments', { status: 500 });
  }
}
