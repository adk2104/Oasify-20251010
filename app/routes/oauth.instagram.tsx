import { redirect } from 'react-router';
import type { Route } from "./+types/oauth.instagram";
import { getSession } from '~/sessions.server';

const INSTAGRAM_OAUTH_EMBED_URL = process.env.INSTAGRAM_OAUTH_EMBED_URL!;

export async function loader({ request }: Route.LoaderArgs) {
  // Check if user is authenticated
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    return redirect('/?error=auth_required');
  }

  const userId = session.get('userId')!.toString();

  // Use pre-configured Embed URL from Meta Developer Dashboard
  const embedUrl = new URL(INSTAGRAM_OAUTH_EMBED_URL);
  embedUrl.searchParams.set('state', userId);

  return redirect(embedUrl.toString());
}
