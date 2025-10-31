import { redirect } from 'react-router';
import type { Route } from './+types/oauth.instagram.start';
import { getSession } from '~/sessions.server';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5173/oauth/instagram/callback';

export async function loader({ request }: Route.LoaderArgs) {
  // Check if user is authenticated
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId')) {
    return redirect('/?error=auth_required');
  }

  // Build Facebook OAuth URL for Instagram permissions
  const scopes = [
    'instagram_basic',
    'instagram_manage_comments',
    'pages_show_list',
    'pages_read_engagement',
  ].join(',');

  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  authUrl.searchParams.set('redirect_uri', INSTAGRAM_REDIRECT_URI);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', session.get('userId').toString());

  // Redirect to Facebook OAuth consent screen
  return redirect(authUrl.toString());
}
