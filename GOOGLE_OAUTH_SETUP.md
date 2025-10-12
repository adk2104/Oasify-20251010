# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth credentials for YouTube integration in Oasify.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- This project cloned locally

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top of the page
3. Click **"New Project"**
4. Enter a project name (e.g., "Oasify YouTube Integration")
5. Click **"Create"**
6. Wait for the project to be created, then select it from the project dropdown

## Step 2: Enable YouTube Data API v3

1. In the Google Cloud Console, make sure your project is selected
2. Navigate to **"APIs & Services"** > **"Library"** (use the left sidebar or search)
3. Search for **"YouTube Data API v3"**
4. Click on **"YouTube Data API v3"** from the results
5. Click the **"Enable"** button
6. Wait for the API to be enabled

## Step 3: Configure OAuth Consent Screen

Before creating credentials, you need to configure the OAuth consent screen:

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Select **"External"** user type (unless you have Google Workspace)
3. Click **"Create"**

### Fill in the consent screen form:

**App information:**
- App name: `Oasify` (or your preferred name)
- User support email: Your email address
- App logo: (optional)

**App domain:**
- Application home page: `http://localhost:5173` (for development)
- Application privacy policy link: (optional for testing)
- Application terms of service link: (optional for testing)

**Developer contact information:**
- Email addresses: Your email address

4. Click **"Save and Continue"**

### Add Scopes:

1. Click **"Add or Remove Scopes"**
2. Filter/search for YouTube scopes
3. Add these scopes:
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
4. Click **"Update"**
5. Click **"Save and Continue"**

### Test Users (for development):

1. Click **"Add Users"**
2. Add your Google email address
3. Add any other test users' email addresses
4. Click **"Save and Continue"**
5. Review the summary and click **"Back to Dashboard"**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ Create Credentials"** at the top
3. Select **"OAuth client ID"**

### Configure the OAuth client:

**Application type:**
- Select **"Web application"**

**Name:**
- Enter a name: `Oasify Web Client` (or your preferred name)

**Authorized JavaScript origins:**
- Click **"+ Add URI"**
- Add: `http://localhost:5173` (for local development)
- For production, also add your production domain (e.g., `https://oasify.app`)

**Authorized redirect URIs:**
- Click **"+ Add URI"**
- Add: `http://localhost:5173/oauth/google/callback`
- For production, also add: `https://yourdomain.com/oauth/google/callback`

4. Click **"Create"**

## Step 5: Copy Your Credentials

After creating the OAuth client, a modal will appear with your credentials:

1. **Copy the Client ID** - It looks like: `123456789-abcdefg.apps.googleusercontent.com`
2. **Copy the Client Secret** - It looks like a random string
3. You can also download the JSON file for safekeeping
4. Click **"OK"**

**Note:** You can always access these credentials later by clicking on your OAuth 2.0 Client ID in the Credentials page.

## Step 6: Add Credentials to Your Project

1. In your project root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in your editor and add your Google credentials:
   ```bash
   # Session security
   SESSION_SECRET=change-this-to-a-random-string-in-production
   NODE_ENV=development

   # Database - Supabase PostgreSQL
   SUPABASE_PASSWORD=your-supabase-password-here

   # Google OAuth for YouTube
   GOOGLE_CLIENT_ID=your-actual-client-id-here
   GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
   GOOGLE_REDIRECT_URI=http://localhost:5173/oauth/google/callback
   ```

3. Replace the placeholder values:
   - `GOOGLE_CLIENT_ID` - Paste your Client ID
   - `GOOGLE_CLIENT_SECRET` - Paste your Client Secret
   - `GOOGLE_REDIRECT_URI` - Should match what you added in step 4

## Step 7: Test the OAuth Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173`

3. Log in to your Oasify account

4. Navigate to the dashboard

5. Click **"Connect YouTube"**

6. You should be redirected to Google's OAuth consent screen

7. Sign in with a Google account that:
   - Has a YouTube channel
   - Is added as a test user (if in testing mode)

8. Grant the requested permissions

9. You should be redirected back to Oasify with a success message

## Troubleshooting

### "Error 400: redirect_uri_mismatch"

This means the redirect URI in your Google Cloud Console doesn't match the one in your `.env` file.

**Solution:**
- Check that `GOOGLE_REDIRECT_URI` in `.env` exactly matches the Authorized redirect URI in Google Cloud Console
- Make sure there are no trailing slashes
- Verify the protocol (http vs https)

### "Access blocked: This app's request is invalid"

This means you haven't configured the OAuth consent screen properly.

**Solution:**
- Go back to **"OAuth consent screen"** in Google Cloud Console
- Make sure you've added the required scopes
- Add yourself as a test user

### "The OAuth client was not found"

This means your Client ID is incorrect.

**Solution:**
- Double-check the `GOOGLE_CLIENT_ID` in your `.env` file
- Make sure you copied the entire Client ID from Google Cloud Console
- Remove any extra spaces or characters

### "No YouTube channel found"

This means the Google account you're signing in with doesn't have a YouTube channel.

**Solution:**
- Create a YouTube channel for your Google account
- Or sign in with a different Google account that has a channel

## Production Deployment

When deploying to production:

1. Update the OAuth consent screen:
   - Change **"Publishing status"** from Testing to Production
   - Update app domains to your production domain

2. Add production URIs to OAuth client:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com/oauth/google/callback`

3. Update your production `.env`:
   ```bash
   GOOGLE_REDIRECT_URI=https://yourdomain.com/oauth/google/callback
   ```

4. Consider applying for verification if you need access to sensitive scopes or want to remove the "unverified app" warning

## Security Notes

- **Never commit your `.env` file** to version control
- Keep your Client Secret secure - treat it like a password
- Regularly rotate credentials if compromised
- Use different OAuth clients for development and production
- Enable 2FA on your Google account
- Review OAuth token usage in Google Cloud Console regularly

## Useful Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth Playground](https://developers.google.com/oauthplayground/) (for testing scopes)

## Need Help?

If you encounter issues not covered here:
1. Check the [Google OAuth 2.0 Troubleshooting Guide](https://developers.google.com/identity/protocols/oauth2/web-server#troubleshooting)
2. Review the console logs in your browser and terminal
3. Verify all credentials are correct in your `.env` file
4. Make sure the YouTube Data API v3 is enabled
5. Ensure your test user has a YouTube channel
