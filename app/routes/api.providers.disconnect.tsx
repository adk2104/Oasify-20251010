import { redirect } from 'react-router';
import type { Route } from './+types/api.providers.disconnect';
import { getSession } from '~/sessions.server';
import { db } from '~/db/config';
import { providers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

export async function action({ request }: Route.ActionArgs) {
  // Check authentication
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.get('userId') as number;

  // Get platform from form data
  const formData = await request.formData();
  const platform = formData.get('platform') as string;

  if (!platform || !['youtube', 'instagram'].includes(platform)) {
    return Response.json({ error: 'Invalid platform' }, { status: 400 });
  }

  try {
    // Delete the provider record
    await db
      .delete(providers)
      .where(and(eq(providers.userId, userId), eq(providers.platform, platform)));

    return Response.json({ success: true, platform });
  } catch (error) {
    console.error('Error disconnecting provider:', error);
    return Response.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
