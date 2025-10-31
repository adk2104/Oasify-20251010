import type { Route } from './+types/api.youtube.comments';
import { getSession } from '~/sessions.server';
import { getStoredComments, syncYouTubeCommentsToDatabase, generateEmpathicForExistingComments } from '~/utils/youtube.server';

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

// POST /api/youtube/comments - Sync from YouTube OR generate empathic versions
export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userId = session.get('userId') as number;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'generate') {
      console.log('[GENERATE START] userId:', userId);
      const count = await generateEmpathicForExistingComments(userId);
      console.log('[GENERATE SUCCESS] Updated', count, 'comments');
      return Response.json({ success: true, count });
    } else {
      console.log('[SYNC START] userId:', userId);
      await syncYouTubeCommentsToDatabase(userId);
      console.log('[SYNC SUCCESS]');
      return Response.json({ success: true });
    }
  } catch (error) {
    console.log('[ERROR]', error);
    throw new Response('Failed to process request', { status: 500 });
  }
}
