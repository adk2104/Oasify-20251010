import { redirect } from 'react-router';
import type { Route } from "./+types/oauth.instagram";
import { getSession } from '~/sessions.server';

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5173/oauth/instagram/callback';

export async function loader({ request }: Route.LoaderArgs) {
  // Check if user is authenticated
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    return redirect('/?error=auth_required');
  }

  // Build Instagram Business Login OAuth URL
  const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_comments',
    'instagram_business_manage_messages',
    'instagram_business_content_publish',
  ].join(',');

  const authUrl = new URL('https://www.instagram.com/oauth/authorize');
  authUrl.searchParams.set('client_id', INSTAGRAM_APP_ID);
  authUrl.searchParams.set('redirect_uri', INSTAGRAM_REDIRECT_URI);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', session.get('userId')!.toString());

  // Redirect to Instagram OAuth consent screen
  return redirect(authUrl.toString());
}
