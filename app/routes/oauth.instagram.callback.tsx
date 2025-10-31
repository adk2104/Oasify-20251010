import { redirect } from 'react-router';
import type { Route } from './+types/oauth.instagram.callback';
import { getSession } from '~/sessions.server';
import { db } from '~/db/config';
import { providers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5173/oauth/instagram/callback';

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
    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        code,
        redirect_uri: INSTAGRAM_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokens = await tokenResponse.json();

    // Get user's Facebook pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokens.access_token}`
    );

    if (!pagesResponse.ok) {
      throw new Error(`Failed to get pages: ${pagesResponse.statusText}`);
    }

    const pagesData = await pagesResponse.json();

    // Find Instagram business account linked to a page
    let instagramAccount = null;
    for (const page of pagesData.data || []) {
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );

      if (igResponse.ok) {
        const igData = await igResponse.json();
        if (igData.instagram_business_account) {
          // Get Instagram account details
          const igAccountResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?fields=id,username,profile_picture_url&access_token=${page.access_token}`
          );

          if (igAccountResponse.ok) {
            const igAccountData = await igAccountResponse.json();
            instagramAccount = {
              pageId: page.id,
              pageName: page.name,
              pageAccessToken: page.access_token,
              instagramBusinessAccountId: igData.instagram_business_account.id,
              username: igAccountData.username,
              profilePicture: igAccountData.profile_picture_url,
            };
            break;
          }
        }
      }
    }

    if (!instagramAccount) {
      return redirect('/dashboard?error=no_instagram_account');
    }

    // Check if provider already exists
    const existingProvider = await db
      .select()
      .from(providers)
      .where(and(eq(providers.userId, userId), eq(providers.platform, 'instagram')))
      .limit(1);

    const updateData = {
      accessToken: instagramAccount.pageAccessToken,
      refreshToken: null, // Page tokens typically don't expire
      expiresAt: null,
      scopes: ['instagram_basic', 'instagram_manage_comments', 'pages_show_list', 'pages_read_engagement'],
      platformUserId: instagramAccount.instagramBusinessAccountId,
      platformData: {
        pageId: instagramAccount.pageId,
        pageName: instagramAccount.pageName,
        username: instagramAccount.username,
        profilePicture: instagramAccount.profilePicture,
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
    console.error('Instagram OAuth error:', error);
    return redirect('/dashboard?error=oauth_failed');
  }
}
