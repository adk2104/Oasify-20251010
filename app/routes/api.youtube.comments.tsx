import type { Route } from './+types/api.youtube.comments';
import { getSession } from '~/sessions.server';
import { getStoredComments, syncYouTubeCommentsToDatabase } from '~/utils/youtube.server';

// GET /api/youtube/comments - Read comments from database
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userId = session.get('userId') as number;

  try {
    const comments = await getStoredComments(userId);
    return Response.json({ comments });
  } catch (error) {
    console.error('Get stored comments error:', error);
    return Response.json({ comments: [] });
  }
}

// POST /api/youtube/comments - Sync from YouTube to database
export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userId = session.get('userId') as number;

  try {
    await syncYouTubeCommentsToDatabase(userId);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Sync YouTube comments error:', error);
    throw new Response('Failed to sync comments', { status: 500 });
  }
}
