import { redirect } from 'react-router';
import type { Route } from './+types/oauth.google.callback';
import { getSession } from '~/sessions.server';
import { db } from '~/db/config';
import { providers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/oauth/google/callback';

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
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokens = await tokenResponse.json();

    // Get channel information
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!channelResponse.ok) {
      throw new Error(`Failed to get channel info: ${channelResponse.statusText}`);
    }

    const channelData = await channelResponse.json();
    const channel = channelData.items?.[0];

    if (!channel) {
      throw new Error('No YouTube channel found');
    }

    // Check if provider already exists
    const existingProvider = await db
      .select()
      .from(providers)
      .where(and(eq(providers.userId, userId), eq(providers.platform, 'youtube')))
      .limit(1);

    const updateData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: ['youtube.readonly', 'youtube.force-ssl'],
      platformUserId: channel.id,
      platformData: {
        channelTitle: channel.snippet.title,
        channelThumbnail: channel.snippet.thumbnails.default?.url,
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
        platform: 'youtube',
        ...updateData,
      });
    }

    // Redirect to dashboard with success message
    return redirect('/dashboard?connected=youtube');
  } catch (error) {
    console.error('Google OAuth error:', error);
    return redirect('/dashboard?error=oauth_failed');
  }
}
