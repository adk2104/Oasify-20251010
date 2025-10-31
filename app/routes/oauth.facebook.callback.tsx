import { redirect } from 'react-router';
import type { Route } from './+types/oauth.facebook.callback';
import { getSession } from '~/sessions.server';
import { db } from '~/db/config';
import { providers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import { exchangeForLongLivedToken, getFacebookPages, getInstagramBusinessAccount } from '~/utils/instagram.server';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5173/oauth/facebook/callback';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Validate parameters
  if (!code || !state) {
    return redirect('/dashboard?error=oauth_failed');
  }

  // Check user session
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId') || session.get('userId').toString() !== state) {
    return redirect('/?error=invalid_session');
  }

  const userId = session.get('userId') as number;

  try {
    // Exchange code for short-lived user access token
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
    tokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;

    // Exchange for long-lived token (60 days)
    const longLivedTokenData = await exchangeForLongLivedToken(shortLivedToken);

    // Get Facebook Pages
    const pages = await getFacebookPages(longLivedTokenData.access_token);

    if (pages.length === 0) {
      throw new Error('No Facebook Pages found. You need to have a Facebook Page connected to an Instagram Business Account.');
    }

    // Use first page (in production, you might want to let user choose)
    const page = pages[0];
    const pageAccessToken = page.access_token;
    const pageId = page.id;

    // Get Instagram Business Account ID
    const igAccount = await getInstagramBusinessAccount(pageId, pageAccessToken);

    // Check if provider already exists
    const existingProvider = await db
      .select()
      .from(providers)
      .where(and(eq(providers.userId, userId), eq(providers.platform, 'instagram')))
      .limit(1);

    const updateData = {
      accessToken: pageAccessToken, // Use page token (doesn't expire)
      refreshToken: null,
      expiresAt: null, // Page tokens don't expire
      scopes: ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_manage_comments'],
      platformUserId: igAccount.id,
      platformData: {
        instagramUsername: igAccount.username,
        facebookPageId: pageId,
        facebookPageName: page.name,
      },
      isActive: true,
      updatedAt: new Date(),
    };

    if (existingProvider.length > 0) {
      // Update existing provider
      await db
        .update(providers)
        .set(updateData)
        .where(eq(providers.id, existingProvider[0].id));
    } else {
      // Insert new provider
      await db.insert(providers).values({
        userId,
        platform: 'instagram',
        ...updateData,
      });
    }

    // Redirect to dashboard with success message
    return redirect('/dashboard?connected=instagram');
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    return redirect('/dashboard?error=oauth_failed');
  }
}
