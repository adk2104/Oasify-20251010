import { data } from 'react-router';
import type { Route } from './+types/api.providers';
import { getSession } from '~/sessions.server';
import { db } from '~/db/config';
import { providers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/providers - Get user's connected providers
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userId = session.get('userId') as number;

  try {
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

    return Response.json({ providers: userProviders });
  } catch (error) {
    console.error('Get providers error:', error);
    throw new Response('Internal server error', { status: 500 });
  }
}

// DELETE /api/providers - Disconnect a provider
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'DELETE') {
    throw new Response('Method not allowed', { status: 405 });
  }

  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userId = session.get('userId') as number;
  const url = new URL(request.url);
  const providerId = url.searchParams.get('id');

  if (!providerId) {
    throw new Response('Provider ID required', { status: 400 });
  }

  try {
    await db
      .delete(providers)
      .where(
        and(
          eq(providers.id, parseInt(providerId)),
          eq(providers.userId, userId)
        )
      );

    return Response.json({ message: 'Provider disconnected' });
  } catch (error) {
    console.error('Delete provider error:', error);
    throw new Response('Internal server error', { status: 500 });
  }
}
