import { redirect } from 'react-router';
import type { Route } from './+types/oauth.instagram.callback';
import { getSession } from '~/sessions.server';
import { db } from '~/db/config';
import { providers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  exchangeInstagramCodeForToken,
  exchangeForLongLivedInstagramToken,
  getInstagramUserProfile,
} from '~/utils/instagram.server';

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5173/oauth/instagram/callback';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorReason = url.searchParams.get('error_reason');

  // Handle user cancellation
  if (error) {
    console.error('Instagram OAuth error:', error, errorReason);
    return redirect('/dashboard?error=instagram_oauth_cancelled');
  }

  // Validate parameters
  if (!code || !state) {
    return redirect('/dashboard?error=oauth_failed');
  }

  // Check user session
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userId') || session.get('userId')!.toString() !== state) {
    return redirect('/?error=invalid_session');
  }

  const userId = session.get('userId') as number;

  try {
    // Step 1: Exchange code for short-lived access token
    console.log('[INSTAGRAM OAUTH] Exchanging code for short-lived token...');
    const shortLivedTokenData = await exchangeInstagramCodeForToken(
      code,
      INSTAGRAM_APP_ID,
      INSTAGRAM_APP_SECRET,
      INSTAGRAM_REDIRECT_URI
    );

    const shortLivedToken = shortLivedTokenData.access_token;
    const instagramUserId = shortLivedTokenData.user_id;
    const permissions = shortLivedTokenData.permissions;

    console.log('[INSTAGRAM OAUTH] Short-lived token obtained. User ID:', instagramUserId);

    // Step 2: Exchange for long-lived token (60 days)
    console.log('[INSTAGRAM OAUTH] Exchanging for long-lived token...');
    const longLivedTokenData = await exchangeForLongLivedInstagramToken(
      shortLivedToken,
      INSTAGRAM_APP_SECRET
    );

    const longLivedToken = longLivedTokenData.access_token;
    const expiresIn = longLivedTokenData.expires_in; // seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    console.log('[INSTAGRAM OAUTH] Long-lived token obtained. Expires in:', expiresIn / 86400, 'days');

    // Step 3: Get Instagram user profile (username)
    console.log('[INSTAGRAM OAUTH] Fetching Instagram user profile...');
    const profile = await getInstagramUserProfile(longLivedToken);

    console.log('[INSTAGRAM OAUTH] Profile fetched. Username:', profile.username);

    // Step 4: Store in database
    const existingProvider = await db
      .select()
      .from(providers)
      .where(and(eq(providers.userId, userId), eq(providers.platform, 'instagram')))
      .limit(1);

    const updateData = {
      accessToken: longLivedToken,
      refreshToken: null,
      expiresAt,
      scopes: permissions || ['instagram_business_basic', 'instagram_business_manage_comments'],
      platformUserId: instagramUserId.toString(),
      platformData: {
        instagramUsername: profile.username,
        accountType: profile.account_type,
      },
      isActive: true,
      updatedAt: new Date(),
    };

    if (existingProvider.length > 0) {
      // Update existing provider
      console.log('[INSTAGRAM OAUTH] Updating existing provider...');
      await db
        .update(providers)
        .set(updateData)
        .where(eq(providers.id, existingProvider[0].id));
    } else {
      // Insert new provider
      console.log('[INSTAGRAM OAUTH] Creating new provider...');
      await db.insert(providers).values({
        userId,
        platform: 'instagram',
        ...updateData,
      });
    }

    console.log('[INSTAGRAM OAUTH] Successfully connected Instagram account:', profile.username);

    // Redirect to dashboard with success message
    return redirect('/dashboard?connected=instagram');
  } catch (error) {
    console.error('Instagram OAuth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return redirect(`/dashboard?error=instagram_oauth_failed&details=${encodeURIComponent(errorMessage)}`);
  }
}
