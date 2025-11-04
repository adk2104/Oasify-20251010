# Instagram API Integration Strategy

**Document Purpose**: Evaluate Instagram API options for Oasify, comparing the current Graph API implementation (requiring Business accounts + Facebook Pages) against alternatives that support personal Instagram accounts.

**Last Updated**: January 2025
**Status**: Active Research & Decision Document

---

## Executive Summary

Oasify currently uses the **Instagram Graph API** which requires users to have:
1. Instagram Business or Creator account
2. Facebook Page connected to that account
3. OAuth authorization through Facebook

This architecture enables full comment management (Oasify's core feature) but excludes users with personal Instagram accounts who haven't converted to business accounts.

**The Core Question**: Should Oasify support personal Instagram accounts, and if so, how?

---

## Current Implementation (new-oasify)

### Architecture Overview

```
User Account (Facebook/Meta)
  └── Facebook Pages (managed by user)
        └── Instagram Business Account (connected to page)
              ├── Media/Posts
              ├── Comments (with management capabilities)
              ├── Insights/Analytics
              └── Mentions/Hashtags
```

### Technical Stack
- **API**: Instagram Graph API v21.0
- **OAuth Provider**: Facebook OAuth 2.0
- **Token Type**: Long-lived Page Access Token (60-day expiry, renewable)
- **Scopes**: `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_comments`

### Current Capabilities
✅ Read comments on all media
✅ Reply to comments
✅ Manage comments (hide/delete)
✅ Fetch media with metadata
✅ Access insights and analytics
✅ Detect mentions and hashtags
✅ Generate AI empathetic responses (Oasify's core value)

### Implementation Files
- `/app/routes/oauth.facebook.start.tsx` - OAuth initiation
- `/app/routes/oauth.facebook.callback.tsx` - Token exchange and page discovery
- `/app/utils/instagram.server.ts` - Graph API helper functions
- `/app/db/schema/providers.ts` - Provider connection storage

---

## Instagram API Options Comparison

### Option 1: Instagram Graph API (Current Implementation)

**Purpose**: Business and Creator account management

**Requirements**:
- Instagram Business or Creator account
- Connected Facebook Page
- Facebook OAuth authorization

**Key Features**:
| Feature | Available | Notes |
|---------|-----------|-------|
| Read Comments | ✅ Yes | Full access to all comments |
| Reply to Comments | ✅ Yes | Post replies as the account |
| Manage Comments | ✅ Yes | Hide, delete, or report |
| Read Media | ✅ Yes | Posts, stories, reels with metadata |
| Insights/Analytics | ✅ Yes | Engagement metrics, reach, impressions |
| Mentions | ✅ Yes | Track when account is mentioned |
| Hashtags | ✅ Yes | Search and track hashtag usage |
| Direct Messages | ❌ No | Requires separate Instagram Messaging API |

**Authentication Flow**:
1. User authorizes app via Facebook OAuth dialog
2. App receives authorization code
3. Exchange code for short-lived user token
4. Exchange for long-lived user token (60 days)
5. Fetch user's Facebook Pages
6. Get page access token (doesn't expire)
7. Lookup Instagram Business Account ID from page
8. Store page token + IG Business Account ID

**API Endpoints Used**:
```
GET /v21.0/me/accounts                                    # List Facebook Pages
GET /v21.0/{page-id}?fields=instagram_business_account   # Get IG account
GET /v21.0/{ig-user-id}/media                            # List media
GET /v21.0/{media-id}/comments                           # List comments
POST /v21.0/{comment-id}/replies                         # Reply to comment
DELETE /v21.0/{comment-id}                               # Delete comment
```

**Pros**:
- ✅ **Full comment management** (essential for Oasify)
- ✅ Production-ready and stable
- ✅ Comprehensive documentation
- ✅ Page tokens are permanent (unless revoked)
- ✅ Industry standard for Instagram business tools
- ✅ Enables analytics and insights features
- ✅ Higher rate limits than Basic Display API
- ✅ Official Meta support and updates

**Cons**:
- ❌ **Requires Business/Creator account** (barrier to entry)
- ❌ **Requires Facebook Page** (additional setup step)
- ❌ Users must understand Meta's business account architecture
- ❌ Cannot serve personal Instagram users who refuse to convert
- ❌ Facebook Page requirement feels unnecessary to users
- ❌ More complex OAuth flow (multiple token exchanges)
- ❌ Meta's business ecosystem can be confusing

**Target Audience**:
- Small business owners
- Content creators monetizing their content
- Social media managers
- Influencers and brand ambassadors
- Marketing professionals
- Anyone treating Instagram professionally

**Market Positioning**:
- Same requirements as competitors (Hootsuite, Buffer, Later, Sprout Social)
- Professional/business tool positioning
- Higher perceived value (enterprise features)

---

### Option 2: Instagram Basic Display API

**Purpose**: Personal account profile and media access

**Requirements**:
- Any Instagram account (personal, business, or creator)
- Instagram OAuth authorization (separate from Facebook)
- User must explicitly approve app access

**Key Features**:
| Feature | Available | Notes |
|---------|-----------|-------|
| Read Comments | ❌ **No** | **Deal-breaker for Oasify** |
| Reply to Comments | ❌ No | Not supported |
| Manage Comments | ❌ No | Not supported |
| Read Media | ✅ Yes | User's own media only (photos, videos, albums) |
| Media Metadata | ✅ Limited | Caption, media type, permalink, timestamp |
| User Profile | ✅ Yes | Username, account ID, profile picture |
| Insights/Analytics | ❌ No | Not available |
| Mentions | ❌ No | Not supported |
| Hashtags | ❌ No | Not supported |
| Direct Messages | ❌ No | Not supported |

**Authentication Flow**:
1. User authorizes app via Instagram OAuth dialog
2. App receives authorization code
3. Exchange code for short-lived access token
4. Exchange for long-lived token (60 days)
5. Store token + Instagram user ID

**API Endpoints Available**:
```
GET /me                                    # User profile
GET /me/media                             # User's media
GET /{media-id}                           # Media details
GET /{user-id}                            # User info
```

**Pros**:
- ✅ **Works with personal accounts** (no conversion needed)
- ✅ **No Facebook Page requirement**
- ✅ Simpler OAuth flow (Instagram-only)
- ✅ Lower barrier to entry for casual users
- ✅ Direct Instagram branding (no Facebook confusion)
- ✅ Easier user communication ("connect your Instagram")
- ✅ Appeals to privacy-conscious users

**Cons**:
- ❌ **Cannot access comments** (eliminates Oasify's core feature)
- ❌ **Cannot reply or manage comments** (no value proposition)
- ❌ Read-only access to media
- ❌ No analytics or insights
- ❌ No mention tracking
- ❌ Lower rate limits (200 requests/hour per user)
- ❌ Tokens expire every 60 days (must re-authorize)
- ❌ Limited to user's own content only
- ❌ Not suitable for business/professional use cases

**Target Audience**:
- Personal Instagram users
- Casual social media users
- Portfolio/showcase use cases
- Media backup/archive applications

**Market Positioning**:
- Cannot compete with professional tools
- Limited to media gallery/viewer apps
- Not viable for comment management tools

---

### Option 3: Instagram Messaging API

**Purpose**: Direct message management for business accounts

**Requirements**:
- Instagram Business or Creator account
- Connected Facebook Page
- Facebook OAuth authorization
- Additional app review and permissions

**Key Features**:
| Feature | Available | Notes |
|---------|-----------|-------|
| Read DMs | ✅ Yes | Access to direct messages |
| Send DMs | ✅ Yes | Respond to messages |
| Manage DMs | ✅ Yes | Mark as read, delete |
| Media in DMs | ✅ Yes | Images, videos in messages |
| Story Mentions | ✅ Yes | When users mention account in stories |
| Story Replies | ✅ Yes | Replies to account's stories |
| Ice Breakers | ✅ Yes | Pre-set response options |

**Note**: This is a **complementary API** to Graph API, not an alternative. It extends Graph API with DM capabilities but still requires Business account + Facebook Page.

**Relevance to Oasify**:
- Could add DM management as a premium feature
- Still requires same account type as current implementation
- Doesn't solve personal account support question

---

## Architecture Options for Oasify

### Option A: Graph API Only (Current - Status Quo)

**Description**: Maintain current implementation requiring Business/Creator accounts with Facebook Pages.

**Architecture**:
```
Oasify Auth Flow
  └── Facebook OAuth
        └── Facebook Pages
              └── Instagram Business Account
                    └── Full Comment Management
```

**Implementation**:
- **Code Changes**: None (already implemented)
- **Database Changes**: None
- **OAuth Routes**: Keep existing `/oauth/facebook/*`
- **Feature Set**: Full comment management, analytics, insights

**User Experience**:
```
1. User clicks "Connect Instagram"
2. Redirected to Facebook OAuth
3. Authorize app access to pages
4. Select Facebook Page with connected IG Business Account
5. Return to Oasify dashboard
6. See Instagram comments with AI empathetic responses
```

**User Requirements**:
1. Convert personal account to Business/Creator (if not already)
2. Create or link Facebook Page
3. Connect Instagram account to Facebook Page
4. Authorize Oasify through Facebook OAuth

**Pros**:
- ✅ Zero development work (already complete)
- ✅ Full feature set available
- ✅ Stable and tested implementation
- ✅ Industry-standard approach (competitive parity)
- ✅ Enables future features (insights, analytics, DMs)
- ✅ Professional positioning in market
- ✅ No ongoing maintenance for dual API support

**Cons**:
- ❌ Excludes personal Instagram users
- ❌ Multi-step setup process may confuse users
- ❌ Facebook Page requirement feels arbitrary
- ❌ Smaller addressable market (business users only)
- ❌ Higher friction in onboarding
- ❌ Must educate users on Business account benefits

**Mitigation Strategies**:
1. **Onboarding Wizard**: Step-by-step guide to convert account and connect page
2. **Video Tutorials**: Screen recordings showing exact setup process
3. **FAQ Section**: Address "Why do I need a Facebook Page?"
4. **Free Facebook Page Creation**: Offer automated page setup during onboarding
5. **Marketing Messaging**: Position as "professional Instagram tool" upfront

**Recommendation Context**:
✅ **Best for**: Oasify as a professional/business tool
✅ **Best if**: Comment management is core value proposition
✅ **Best when**: Targeting creators, small businesses, social media managers

---

### Option B: Dual API Implementation (Graph + Basic Display)

**Description**: Support both Graph API (business accounts) and Basic Display API (personal accounts) with feature gating.

**Architecture**:
```
Oasify Auth Flow
  ├── Facebook OAuth (Business/Creator accounts)
  │     └── Facebook Pages
  │           └── Instagram Business Account
  │                 └── Full Comment Management (Premium Tier)
  │
  └── Instagram OAuth (Personal accounts)
        └── Instagram Personal Account
              └── Media Gallery Only (Limited/Free Tier)
```

**Implementation**:

**Code Changes Required**:
1. **New OAuth Routes**:
   - `/oauth/instagram/start` - Instagram Basic Display OAuth start
   - `/oauth/instagram/callback` - Instagram token exchange
2. **New Server Utilities** (`app/utils/instagram-basic.server.ts`):
   - `exchangeForLongLivedToken()`
   - `getUserProfile()`
   - `getUserMedia()`
   - `validateBasicToken()`
3. **Updated Database Schema**:
   ```typescript
   // Add to providers table platformData
   platformData: {
     accountType?: 'business' | 'personal',
     apiType?: 'graph' | 'basic_display',
     // ... existing fields
   }
   ```
4. **Feature Gating Logic** (`app/utils/feature-access.ts`):
   ```typescript
   function canAccessComments(provider: Provider): boolean {
     return provider.platformData.apiType === 'graph';
   }
   ```
5. **Dashboard UI Updates**:
   - Show different features based on account type
   - Upsell messaging for personal accounts
   - "Upgrade to Business Account" CTAs

**User Experience Flow**:

**For Personal Accounts**:
```
1. User clicks "Connect Instagram"
2. Choose: "Business Account" or "Personal Account"
3. If Personal:
   a. Redirected to Instagram OAuth (not Facebook)
   b. Authorize Oasify
   c. Return to dashboard
   d. See media gallery (no comments)
   e. Banner: "Upgrade to Business Account to manage comments"
```

**For Business Accounts**:
```
1. User clicks "Connect Instagram"
2. Choose: "Business Account" or "Personal Account"
3. If Business:
   a. Redirected to Facebook OAuth
   b. Existing flow (unchanged)
```

**Database Changes**:
- Add `accountType` and `apiType` columns to `platformData` JSONB
- Update `scopes` to handle different permission sets
- Add feature flags for comment access

**Environment Variables**:
```bash
# Existing
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_REDIRECT_URI=...

# New for Basic Display API
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
INSTAGRAM_REDIRECT_URI=http://localhost:5173/oauth/instagram/callback
```

**Feature Matrix**:
| Feature | Personal Account | Business Account |
|---------|------------------|------------------|
| View Own Media | ✅ Yes | ✅ Yes |
| View Comments | ❌ No | ✅ Yes |
| AI Empathetic Responses | ❌ No | ✅ Yes |
| Reply to Comments | ❌ No | ✅ Yes |
| Manage Comments | ❌ No | ✅ Yes |
| Analytics Dashboard | ❌ No | ✅ Yes |
| Mention Tracking | ❌ No | ✅ Yes |

**Pros**:
- ✅ **Supports personal accounts** (broader addressable market)
- ✅ Lower barrier to entry (free tier with Instagram-only auth)
- ✅ Freemium conversion funnel (personal → business upgrade)
- ✅ Appeal to casual users initially
- ✅ Competitive differentiation (if competitors don't support personal)
- ✅ User can try app with personal account before converting

**Cons**:
- ❌ **Significant development effort** (estimated 40-60 hours)
- ❌ **Ongoing maintenance burden** (two OAuth flows, two token systems)
- ❌ **Complex feature gating logic** (must handle both account types everywhere)
- ❌ **Confusing user experience** (two connection options, different features)
- ❌ **Split codebase complexity** (if/else checks throughout app)
- ❌ **Testing complexity** (must test both flows continuously)
- ❌ **Personal accounts get minimal value** (can't use core features)
- ❌ **Dilutes product focus** (split between two user personas)
- ❌ **Higher support burden** ("Why can't I see comments?")
- ❌ **Two Meta app registrations** (one for each API)
- ❌ **Rate limit management for two APIs**

**Development Estimate**:
- **Backend**: 20-25 hours
  - New OAuth routes
  - Basic Display API utilities
  - Database schema updates
  - Feature gating logic
- **Frontend**: 15-20 hours
  - Account type selection UI
  - Feature-gated dashboard components
  - Upgrade prompts and upsell messaging
  - Two connection flows
- **Testing**: 10-15 hours
  - Both OAuth flows
  - Feature gating validation
  - Error handling for both APIs
- **Documentation**: 5 hours
  - User onboarding for both paths
  - Developer documentation

**Total**: 50-65 hours of development + ongoing maintenance

**Recommendation Context**:
⚠️ **Consider if**: Freemium business model is core strategy
⚠️ **Consider if**: Personal account market is significant
⚠️ **Risky because**: High complexity for minimal value (personal accounts can't use core features)

---

### Option C: Hybrid Approach (Graph API + Enhanced Onboarding)

**Description**: Keep Graph API only, but significantly improve onboarding UX for personal account users to convert to Business accounts seamlessly.

**Architecture**:
```
Oasify Onboarding Flow
  └── Detect Account Type
        ├── If Business Account
        │     └── Standard Facebook OAuth → Done
        │
        └── If Personal Account
              └── Guided Conversion Wizard
                    ├── Step 1: Convert to Business Account (in-app instructions)
                    ├── Step 2: Create/Link Facebook Page (automated)
                    ├── Step 3: Connect Accounts (automated)
                    └── Step 4: Authorize Oasify → Done
```

**Implementation**:

**Code Changes Required**:
1. **Account Type Detection** (before OAuth):
   - Use Instagram Basic Display API temporarily to check account type
   - Or use Facebook Graph API `/me/accounts` to see if pages exist
   - Direct personal users to conversion wizard

2. **Onboarding Wizard Component** (`app/components/InstagramOnboardingWizard.tsx`):
   - Step-by-step visual guide
   - Embedded video tutorials
   - Screenshots for each step
   - Real-time validation of completion

3. **Automated Facebook Page Creation**:
   - Use Facebook Pages API to create page on user's behalf (if permissions allow)
   - Pre-fill page details with Instagram username
   - Link page to Instagram automatically

4. **Progressive OAuth Flow**:
   ```
   1. Request initial permissions to detect account type
   2. If personal account detected:
      a. Show wizard
      b. Guide user through Instagram app (open deep link)
      c. Detect when conversion complete
      d. Resume OAuth flow
   3. If business account detected:
      a. Standard flow (existing)
   ```

5. **Educational Content**:
   - `/learn/why-business-account` - Benefits page
   - `/learn/setup-guide` - Video walkthrough
   - In-app tooltips and help text
   - Live chat support during onboarding

**User Experience Flow**:

**For Personal Account Users**:
```
1. User clicks "Connect Instagram"
2. Oasify detects personal account
3. Show: "Instagram Business Account Required" page with:
   ✨ "Don't worry! Converting is free, easy, and reversible"
   📹 Video: "How to Convert in 2 Minutes"
   ✅ Benefits: "What you gain from Business Account"
   🔘 Button: "Start Setup Wizard"

4. Setup Wizard (Step-by-step):

   Step 1: Convert to Business Account
   - Show Instagram app icon
   - Button: "Open Instagram App"
   - Instructions: "Tap Profile → Settings → Account → Switch to Professional Account"
   - Checkbox: "I've converted to a Business Account"

   Step 2: Create Facebook Page (or Link Existing)
   - Option A: "Create New Page" (Oasify does this automatically)
   - Option B: "I already have a Facebook Page"
   - For Option A: Auto-create with pre-filled details

   Step 3: Link Instagram to Facebook Page
   - Button: "Open Instagram App"
   - Instructions: "Settings → Account → Linked Accounts → Facebook → Connect"
   - Validation: Check if connection successful

   Step 4: Authorize Oasify
   - Button: "Connect to Oasify"
   - Standard Facebook OAuth flow
   - Success page with confetti animation

5. User completes wizard → Full Oasify access
```

**For Business Account Users**:
```
1. User clicks "Connect Instagram"
2. Oasify detects business account
3. Standard OAuth flow (no wizard)
4. Done
```

**Technical Components**:

**Wizard State Management**:
```typescript
type WizardStep = 'detect' | 'convert' | 'create-page' | 'link-accounts' | 'authorize' | 'complete';

interface OnboardingState {
  currentStep: WizardStep;
  accountType: 'personal' | 'business' | 'creator';
  hasCompletedConversion: boolean;
  hasFacebookPage: boolean;
  isLinked: boolean;
}
```

**Validation Functions**:
```typescript
async function validateBusinessAccount(userId: string): Promise<boolean>
async function validateFacebookPage(userId: string): Promise<boolean>
async function validateInstagramConnection(pageId: string): Promise<boolean>
```

**Database Changes**:
```typescript
// Add onboarding tracking
export const onboardingProgress = pgTable('onboarding_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  currentStep: text('current_step').notNull(),
  completedSteps: text('completed_steps').array(),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});
```

**Environment Variables**:
```bash
# Existing
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_REDIRECT_URI=...

# Optional: For page creation automation
FACEBOOK_PAGE_CREATION_ENABLED=true
```

**Pros**:
- ✅ **Maintains full feature set** (all users get comment management)
- ✅ **Reasonable development effort** (20-30 hours vs 50-65 for dual API)
- ✅ **Single OAuth flow to maintain** (lower complexity)
- ✅ **Educates users on Business account benefits**
- ✅ **Guided experience reduces drop-off**
- ✅ **Automated steps reduce friction**
- ✅ **Can still serve personal account users** (after quick conversion)
- ✅ **Professional positioning maintained**
- ✅ **Conversion step becomes value-add** (user learns Instagram features)
- ✅ **Competitive advantage** (better onboarding than competitors)

**Cons**:
- ❌ **Still requires account conversion** (not truly "personal account support")
- ❌ **Onboarding takes longer** (wizard adds time)
- ❌ **Users must take action in Instagram app** (context switching)
- ❌ **Dependent on Instagram UI** (if Instagram changes settings, wizard breaks)
- ❌ **Cannot fully automate** (user must perform some steps manually)
- ❌ **May feel like "bait and switch"** (advertise Instagram, require Facebook)

**Development Estimate**:
- **Backend**: 8-10 hours
  - Account type detection
  - Onboarding progress tracking
  - Validation endpoints
- **Frontend**: 12-15 hours
  - Wizard component with steps
  - Video integration
  - Real-time validation UI
  - Success/error states
- **Content Creation**: 5-8 hours
  - Record tutorial videos
  - Write step-by-step guides
  - Design graphics/screenshots
- **Testing**: 5-7 hours
  - Test wizard flow
  - User testing with personal accounts

**Total**: 30-40 hours of development + content creation

**Recommendation Context**:
✅ **Best for**: Balancing user experience with full features
✅ **Best if**: Want to support personal users without sacrificing comment management
✅ **Best when**: Can invest in onboarding UX but not dual API maintenance

---

## Competitive Landscape Analysis

### How Other Tools Handle This

**Professional Social Media Management Tools**:
| Tool | Instagram Support | Account Requirements | Pricing |
|------|-------------------|---------------------|---------|
| **Hootsuite** | Business/Creator only | Facebook Page required | $99+/mo |
| **Buffer** | Business/Creator only | Facebook Page required | $12+/mo |
| **Later** | Business/Creator only | Facebook Page required | $25+/mo |
| **Sprout Social** | Business/Creator only | Facebook Page required | $249+/mo |
| **Agorapulse** | Business/Creator only | Facebook Page required | $79+/mo |

**Insight**: All professional competitors require Business accounts + Facebook Pages. This is industry standard.

**Personal Account Tools** (No comment management):
| Tool | Instagram Support | Account Requirements | Features |
|------|-------------------|---------------------|----------|
| **Unfold** | Personal accounts | Instagram Basic Display | Story templates only |
| **Preview App** | Personal accounts | Instagram Basic Display | Media planning/preview |
| **Planoly** | Basic tier allows personal | Instagram Basic Display | Media scheduling (limited) |

**Insight**: Tools that support personal accounts have severely limited features and don't compete with professional tools.

### Market Segmentation

**Business Account User Persona**:
- Small business owners (bakeries, boutiques, gyms)
- Content creators with 10K+ followers
- Social media managers for brands
- Influencers and brand ambassadors
- Marketing agencies
- E-commerce sellers

**Characteristics**:
- Treat Instagram as business channel
- Need analytics and insights
- High engagement volume (many comments)
- Willing to pay for tools
- Already using Business accounts (or willing to convert)

**Market Size**: ~200M Instagram Business accounts globally

---

**Personal Account User Persona**:
- Casual Instagram users
- Personal content sharers (friends/family)
- Hobbyists and enthusiasts
- Privacy-conscious users
- Users with <1K followers

**Characteristics**:
- Treat Instagram as personal social network
- Low comment volume
- Less willing to pay for tools
- Resistant to "business" features
- May not understand need for conversion

**Market Size**: ~2 billion Instagram accounts globally, but not target market for professional tools

---

### Competitive Positioning Strategy

**Option A (Graph API Only)**:
- **Positioning**: "Professional Instagram Comment Management for Businesses"
- **Competitive Set**: Hootsuite, Buffer, Sprout Social
- **Differentiator**: AI-powered empathetic responses
- **Target**: Business users (same as all competitors)

**Option B (Dual API)**:
- **Positioning**: "Instagram Tool for Everyone - Personal or Business"
- **Competitive Set**: Confusing (split between personal and pro tools)
- **Differentiator**: Support for personal accounts (but limited features)
- **Target**: Unclear (trying to serve two personas)
- **Risk**: Diluted value proposition

**Option C (Hybrid)**:
- **Positioning**: "Professional Instagram Tool with Easiest Setup"
- **Competitive Set**: Hootsuite, Buffer, Sprout Social
- **Differentiator**: Best onboarding experience + AI responses
- **Target**: Business users (but easier to convert from personal)

---

## Technical Implementation Deep Dive

### Option B: Dual API Implementation (Detailed)

If pursuing dual API support, here's the complete implementation plan:

#### Phase 1: Database Schema Updates (2-3 hours)

**File**: `app/db/schema/providers.ts`

```typescript
// Update platformData type
platformData: jsonb('platform_data').$type<{
  // Existing fields
  instagramUsername?: string;
  facebookPageId?: string;
  facebookPageName?: string;

  // New fields for dual API support
  accountType?: 'business' | 'creator' | 'personal';
  apiType?: 'graph' | 'basic_display';

  // Graph API specific
  pageAccessToken?: string;  // Only for Graph API
  instagramBusinessId?: string;  // Only for Graph API

  // Basic Display API specific
  instagramUserId?: string;  // Only for Basic Display
}>()
```

**Migration File**: `migrations/add_account_type_support.sql`

```sql
-- No schema change needed (JSONB is flexible)
-- Just update application logic to handle new fields
```

#### Phase 2: Instagram Basic Display OAuth (8-10 hours)

**File**: `app/routes/oauth.instagram.start.tsx`

```typescript
import { redirect } from "react-router";
import type { Route } from "./+types/oauth.instagram.start";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/?error=unauthorized");
  }

  const authUrl = new URL("https://api.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!);
  authUrl.searchParams.set("redirect_uri", process.env.INSTAGRAM_REDIRECT_URI!);
  authUrl.searchParams.set("scope", "user_profile,user_media");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", userId.toString());

  return redirect(authUrl.toString());
}
```

**File**: `app/routes/oauth.instagram.callback.tsx`

```typescript
import { redirect, data } from "react-router";
import type { Route } from "./+types/oauth.instagram.callback";
import { exchangeCodeForToken, getUserProfile } from "~/utils/instagram-basic.server";
import { db } from "~/db/config";
import { providers } from "~/db/schema/providers";
import { eq, and } from "drizzle-orm";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return redirect(`/dashboard?error=${error}`);
  }

  if (!code || !state) {
    return redirect("/dashboard?error=missing_code");
  }

  const userId = parseInt(state);

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    // Get user profile
    const userProfile = await getUserProfile(tokenData.access_token);

    // Store in database
    const existingProvider = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.userId, userId),
          eq(providers.platform, "instagram")
        )
      )
      .limit(1);

    if (existingProvider.length > 0) {
      // Update existing
      await db
        .update(providers)
        .set({
          accessToken: tokenData.access_token,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          platformUserId: userProfile.id,
          platformData: {
            accountType: 'personal',
            apiType: 'basic_display',
            instagramUsername: userProfile.username,
            instagramUserId: userProfile.id,
          },
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(providers.id, existingProvider[0].id));
    } else {
      // Insert new
      await db.insert(providers).values({
        userId,
        platform: "instagram",
        accessToken: tokenData.access_token,
        refreshToken: null,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        scopes: ["user_profile", "user_media"],
        platformUserId: userProfile.id,
        platformData: {
          accountType: 'personal',
          apiType: 'basic_display',
          instagramUsername: userProfile.username,
          instagramUserId: userProfile.id,
        },
        isActive: true,
      });
    }

    return redirect("/dashboard?instagram=connected");
  } catch (error) {
    console.error("Instagram Basic Display OAuth error:", error);
    return redirect("/dashboard?error=oauth_failed");
  }
}
```

**File**: `app/utils/instagram-basic.server.ts`

```typescript
/**
 * Instagram Basic Display API utilities
 * For personal Instagram accounts (limited features - no comments)
 */

interface TokenResponse {
  access_token: string;
  user_id: number;
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface UserProfile {
  id: string;
  username: string;
  account_type: 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL';
  media_count: number;
}

interface MediaItem {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  timestamp: string;
  username: string;
}

/**
 * Exchange authorization code for short-lived access token
 */
export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const url = new URL("https://api.instagram.com/oauth/access_token");

  const formData = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
    code,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<LongLivedTokenResponse> {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", process.env.INSTAGRAM_APP_SECRET!);
  url.searchParams.set("access_token", shortLivedToken);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Long-lived token exchange failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Refresh long-lived token (extends expiry another 60 days)
 */
export async function refreshLongLivedToken(
  accessToken: string
): Promise<LongLivedTokenResponse> {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Get user profile information
 */
export async function getUserProfile(accessToken: string): Promise<UserProfile> {
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set("fields", "id,username,account_type,media_count");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Get user profile failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Get user's media (posts)
 * NOTE: Cannot get comments with Basic Display API
 */
export async function getUserMedia(
  accessToken: string,
  limit: number = 20
): Promise<MediaItem[]> {
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields", "id,caption,media_type,media_url,permalink,timestamp,username");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("limit", limit.toString());

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Get user media failed: ${errorText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Validate token is still active
 */
export async function validateBasicToken(accessToken: string): Promise<boolean> {
  try {
    await getUserProfile(accessToken);
    return true;
  } catch {
    return false;
  }
}
```

#### Phase 3: Feature Gating Logic (5-7 hours)

**File**: `app/utils/feature-access.ts`

```typescript
import type { Provider } from "~/db/schema/providers";

export type FeatureName =
  | "view_comments"
  | "reply_to_comments"
  | "manage_comments"
  | "ai_responses"
  | "analytics"
  | "mentions";

/**
 * Check if a provider has access to a specific feature
 */
export function hasFeatureAccess(
  provider: Provider,
  feature: FeatureName
): boolean {
  const apiType = provider.platformData?.apiType;

  // Basic Display API features
  if (apiType === "basic_display") {
    return false; // No comment-related features
  }

  // Graph API features (all features available)
  if (apiType === "graph") {
    return true;
  }

  // Fallback: assume Graph API if not specified (backward compatibility)
  return true;
}

/**
 * Get list of features available for a provider
 */
export function getAvailableFeatures(provider: Provider): FeatureName[] {
  const apiType = provider.platformData?.apiType;

  if (apiType === "basic_display") {
    return []; // Personal accounts have no comment features
  }

  // Graph API has all features
  return [
    "view_comments",
    "reply_to_comments",
    "manage_comments",
    "ai_responses",
    "analytics",
    "mentions",
  ];
}

/**
 * Get account type display name
 */
export function getAccountTypeLabel(provider: Provider): string {
  const accountType = provider.platformData?.accountType;

  switch (accountType) {
    case "business":
      return "Business Account";
    case "creator":
      return "Creator Account";
    case "personal":
      return "Personal Account";
    default:
      return "Instagram Account";
  }
}

/**
 * Check if provider should show upgrade prompt
 */
export function shouldShowUpgradePrompt(provider: Provider): boolean {
  return provider.platformData?.apiType === "basic_display";
}
```

#### Phase 4: Connection Selection UI (8-10 hours)

**File**: `app/components/InstagramConnectionOptions.tsx`

```typescript
import { Link } from "react-router";

export function InstagramConnectionOptions() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Connect Your Instagram Account</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Business/Creator Account Option */}
        <div className="border-2 border-blue-500 rounded-lg p-6 relative">
          <div className="absolute -top-3 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
            Recommended
          </div>

          <h3 className="text-xl font-semibold mb-3">Business or Creator Account</h3>

          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Manage all comments with AI responses</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Reply and moderate comments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>View analytics and insights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Track mentions and hashtags</span>
            </li>
          </ul>

          <Link
            to="/oauth/facebook/start"
            className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Connect Business Account
          </Link>

          <p className="text-sm text-gray-500 mt-3">
            Requires Facebook Page connection (free)
          </p>
        </div>

        {/* Personal Account Option */}
        <div className="border rounded-lg p-6 bg-gray-50">
          <h3 className="text-xl font-semibold mb-3">Personal Account</h3>

          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>View your posts and media</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">✗</span>
              <span className="text-gray-500">Cannot view comments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">✗</span>
              <span className="text-gray-500">Cannot reply to comments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">✗</span>
              <span className="text-gray-500">No AI features available</span>
            </li>
          </ul>

          <Link
            to="/oauth/instagram/start"
            className="block w-full bg-gray-300 text-gray-700 text-center py-3 rounded-lg font-semibold hover:bg-gray-400"
          >
            Connect Personal Account
          </Link>

          <p className="text-sm text-gray-500 mt-3">
            Limited features - No Facebook required
          </p>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold mb-2">Don't have a Business Account?</h4>
        <p className="text-sm text-gray-700 mb-3">
          Converting is free, easy, and reversible. We'll guide you through the setup process.
        </p>
        <Link
          to="/learn/convert-to-business"
          className="text-blue-600 text-sm font-semibold hover:underline"
        >
          Learn how to convert →
        </Link>
      </div>
    </div>
  );
}
```

#### Phase 5: Dashboard Feature Gating (6-8 hours)

**File**: `app/routes/dashboard.tsx` (update)

```typescript
import { hasFeatureAccess, shouldShowUpgradePrompt } from "~/utils/feature-access";

export async function loader({ request }: Route.LoaderArgs) {
  // ... existing loader code ...

  const providers = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.userId, userId));

  const instagramProvider = providers.find(p => p.platform === "instagram");

  return data({
    user,
    providers,
    features: {
      canViewComments: instagramProvider
        ? hasFeatureAccess(instagramProvider, "view_comments")
        : false,
      canReplyToComments: instagramProvider
        ? hasFeatureAccess(instagramProvider, "reply_to_comments")
        : false,
      showUpgradePrompt: instagramProvider
        ? shouldShowUpgradePrompt(instagramProvider)
        : false,
    },
  });
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { features } = loaderData;

  return (
    <div>
      {features.showUpgradePrompt && <UpgradeToBusiness />}

      {features.canViewComments ? (
        <CommentsSection />
      ) : (
        <MediaGallery />
      )}
    </div>
  );
}
```

**File**: `app/components/UpgradeToBusiness.tsx`

```typescript
import { Link } from "react-router";

export function UpgradeToBusiness() {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold mb-2">
            Unlock Comment Management with Business Account
          </h3>
          <p className="text-blue-100 mb-4">
            Get AI-powered empathetic responses, reply to comments, and manage your Instagram engagement.
          </p>
          <div className="flex gap-3">
            <Link
              to="/learn/convert-to-business"
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50"
            >
              Learn How to Upgrade
            </Link>
            <Link
              to="/oauth/facebook/start"
              className="border-2 border-white text-white px-4 py-2 rounded-lg font-semibold hover:bg-white hover:text-blue-600"
            >
              Connect Business Account
            </Link>
          </div>
        </div>
        <button className="text-blue-200 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}
```

---

### Option C: Hybrid Approach (Detailed)

Implementation details for enhanced onboarding wizard:

#### Phase 1: Account Type Detection (3-4 hours)

**File**: `app/utils/instagram-detect.server.ts`

```typescript
/**
 * Detect if user has Instagram Business Account connected to Facebook Page
 * Uses Facebook Graph API
 */
export async function detectInstagramAccountType(
  facebookAccessToken: string
): Promise<{
  hasBusinessAccount: boolean;
  hasFacebookPage: boolean;
  pages?: Array<{ id: string; name: string; hasInstagram: boolean }>;
}> {
  // Get user's Facebook Pages
  const pagesResponse = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${facebookAccessToken}`
  );

  if (!pagesResponse.ok) {
    throw new Error("Failed to fetch Facebook Pages");
  }

  const pagesData = await pagesResponse.json();
  const pages = pagesData.data || [];

  if (pages.length === 0) {
    return {
      hasBusinessAccount: false,
      hasFacebookPage: false,
    };
  }

  // Check each page for Instagram connection
  const pagesWithInstagram = await Promise.all(
    pages.map(async (page: any) => {
      try {
        const igResponse = await fetch(
          `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igResponse.json();

        return {
          id: page.id,
          name: page.name,
          hasInstagram: !!igData.instagram_business_account,
        };
      } catch {
        return {
          id: page.id,
          name: page.name,
          hasInstagram: false,
        };
      }
    })
  );

  const hasInstagram = pagesWithInstagram.some((p) => p.hasInstagram);

  return {
    hasBusinessAccount: hasInstagram,
    hasFacebookPage: pages.length > 0,
    pages: pagesWithInstagram,
  };
}
```

#### Phase 2: Onboarding Wizard Component (10-12 hours)

**File**: `app/components/InstagramOnboardingWizard.tsx`

```typescript
import { useState } from "react";
import { Link } from "react-router";

type WizardStep = "welcome" | "check-account" | "convert" | "create-page" | "link-accounts" | "authorize" | "complete";

export function InstagramOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [hasBusinessAccount, setHasBusinessAccount] = useState(false);
  const [hasFacebookPage, setHasFacebookPage] = useState(false);
  const [isAccountLinked, setIsAccountLinked] = useState(false);

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Setup Progress</span>
          <span className="text-sm text-gray-500">
            {currentStep === "complete" ? "Complete!" : "In Progress"}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-blue-600 rounded-full transition-all"
            style={{ width: getProgressPercent(currentStep) }}
          />
        </div>
      </div>

      {/* Welcome Step */}
      {currentStep === "welcome" && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">
            Let's Connect Your Instagram Account
          </h2>
          <p className="text-gray-600 mb-8">
            Oasify needs access to your Instagram comments to provide AI-powered empathetic responses. This requires an Instagram Business or Creator account.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-3">What You'll Need:</h3>
            <ul className="text-left space-y-2 text-sm">
              <li className="flex gap-2">
                <span>✓</span>
                <span>Instagram Business or Creator account (free to convert)</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Facebook Page (we'll help you create one)</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>5 minutes of your time</span>
              </li>
            </ul>
          </div>
          <button
            onClick={() => setCurrentStep("check-account")}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Get Started
          </button>
        </div>
      )}

      {/* Check Account Step */}
      {currentStep === "check-account" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Step 1: Check Your Account Type</h2>
          <p className="text-gray-600 mb-6">
            First, let's see if you already have an Instagram Business or Creator account.
          </p>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-3">How to Check:</h3>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Open the Instagram app on your phone</li>
              <li>Go to your profile</li>
              <li>Tap the menu (☰) → Settings</li>
              <li>Look at the "Account" section</li>
            </ol>
          </div>

          <div className="space-y-3">
            <p className="font-medium">What type of account do you have?</p>
            <button
              onClick={() => {
                setHasBusinessAccount(true);
                setCurrentStep("create-page");
              }}
              className="w-full border-2 border-green-500 bg-green-50 text-green-700 p-4 rounded-lg text-left hover:bg-green-100"
            >
              <div className="font-semibold">Business or Creator Account</div>
              <div className="text-sm">I see "Switch to Personal Account" in settings</div>
            </button>
            <button
              onClick={() => {
                setHasBusinessAccount(false);
                setCurrentStep("convert");
              }}
              className="w-full border-2 border-gray-300 p-4 rounded-lg text-left hover:bg-gray-50"
            >
              <div className="font-semibold">Personal Account</div>
              <div className="text-sm">I see "Switch to Professional Account" in settings</div>
            </button>
          </div>
        </div>
      )}

      {/* Convert Account Step */}
      {currentStep === "convert" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Step 2: Convert to Business Account</h2>
          <p className="text-gray-600 mb-6">
            Don't worry! Converting is free, easy, and completely reversible. You can switch back anytime.
          </p>

          {/* Video Tutorial */}
          <div className="bg-black rounded-lg mb-6 aspect-video flex items-center justify-center">
            <div className="text-white">
              📹 Video Tutorial: How to Convert (2 minutes)
            </div>
          </div>

          {/* Step-by-step Instructions */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-3">Step-by-Step Instructions:</h3>
            <ol className="space-y-3 text-sm">
              <li>
                <div className="font-medium">1. Open Instagram app</div>
                <div className="text-gray-600">Use the Instagram app on your phone</div>
              </li>
              <li>
                <div className="font-medium">2. Go to Settings</div>
                <div className="text-gray-600">Profile → Menu (☰) → Settings</div>
              </li>
              <li>
                <div className="font-medium">3. Switch to Professional Account</div>
                <div className="text-gray-600">Account → Switch to Professional Account</div>
              </li>
              <li>
                <div className="font-medium">4. Choose "Creator" or "Business"</div>
                <div className="text-gray-600">Either works! Pick what describes you best</div>
              </li>
              <li>
                <div className="font-medium">5. Complete the setup</div>
                <div className="text-gray-600">Follow Instagram's prompts</div>
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm">
              <strong>Benefits of Business Account:</strong> Analytics, insights, contact button, and ability to use tools like Oasify!
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep("check-account")}
              className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep("create-page")}
              className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              I've Converted My Account
            </button>
          </div>
        </div>
      )}

      {/* Create/Link Facebook Page Step */}
      {currentStep === "create-page" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Step 3: Facebook Page Setup</h2>
          <p className="text-gray-600 mb-6">
            Instagram Business accounts must be connected to a Facebook Page. This is Meta's requirement, not ours!
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => {
                // TODO: Implement automatic page creation
                setHasFacebookPage(true);
                setCurrentStep("link-accounts");
              }}
              className="border-2 border-blue-500 bg-blue-50 p-6 rounded-lg text-left hover:bg-blue-100"
            >
              <div className="font-semibold mb-2">Create New Page (Automatic)</div>
              <div className="text-sm text-gray-600">
                We'll create a Facebook Page for you with your Instagram name
              </div>
            </button>
            <button
              onClick={() => {
                setHasFacebookPage(true);
                setCurrentStep("link-accounts");
              }}
              className="border-2 border-gray-300 p-6 rounded-lg text-left hover:bg-gray-50"
            >
              <div className="font-semibold mb-2">I Already Have a Page</div>
              <div className="text-sm text-gray-600">
                Use an existing Facebook Page
              </div>
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm">
              <strong>Why Facebook Page?</strong> Instagram Business accounts use Facebook's infrastructure for API access. Your page won't be public if you don't want it to be.
            </p>
          </div>
        </div>
      )}

      {/* Link Accounts Step */}
      {currentStep === "link-accounts" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Step 4: Link Instagram to Facebook Page</h2>
          <p className="text-gray-600 mb-6">
            Now let's connect your Instagram Business account to your Facebook Page.
          </p>

          {/* Video Tutorial */}
          <div className="bg-black rounded-lg mb-6 aspect-video flex items-center justify-center">
            <div className="text-white">
              📹 Video Tutorial: Linking Accounts (1 minute)
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-3">How to Link:</h3>
            <ol className="space-y-2 text-sm">
              <li>
                <div className="font-medium">1. Open Instagram app</div>
                <div className="text-gray-600">Go to your profile</div>
              </li>
              <li>
                <div className="font-medium">2. Settings → Account</div>
                <div className="text-gray-600">Menu (☰) → Settings → Account</div>
              </li>
              <li>
                <div className="font-medium">3. Linked Accounts → Facebook</div>
                <div className="text-gray-600">Tap "Facebook"</div>
              </li>
              <li>
                <div className="font-medium">4. Log in and select your Page</div>
                <div className="text-gray-600">Choose the page you created or want to use</div>
              </li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep("create-page")}
              className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep("authorize")}
              className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              I've Linked My Accounts
            </button>
          </div>
        </div>
      )}

      {/* Authorize Step */}
      {currentStep === "authorize" && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Almost Done!</h2>
          <p className="text-gray-600 mb-8">
            Now authorize Oasify to access your Instagram comments through Facebook.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-3">✓ You're All Set!</h3>
            <ul className="text-left space-y-2 text-sm max-w-md mx-auto">
              <li className="flex gap-2">
                <span>✓</span>
                <span>Converted to Business/Creator account</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Created or linked Facebook Page</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Connected Instagram to Facebook Page</span>
              </li>
            </ul>
          </div>

          <Link
            to="/oauth/facebook/start"
            className="inline-block bg-blue-600 text-white px-12 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700"
          >
            Authorize Oasify
          </Link>
        </div>
      )}

      {/* Complete Step */}
      {currentStep === "complete" && (
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold mb-4">You're Connected!</h2>
          <p className="text-gray-600 mb-8">
            Your Instagram account is now connected to Oasify. Start managing your comments with AI-powered empathetic responses!
          </p>
          <Link
            to="/dashboard"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

function getProgressPercent(step: WizardStep): string {
  const steps: Record<WizardStep, number> = {
    welcome: 0,
    "check-account": 15,
    convert: 30,
    "create-page": 50,
    "link-accounts": 70,
    authorize: 85,
    complete: 100,
  };
  return `${steps[step]}%`;
}
```

---

## Decision Framework

### Evaluation Criteria

Rate each option (1-5 scale, 5 = best):

| Criteria | Option A (Status Quo) | Option B (Dual API) | Option C (Hybrid) |
|----------|----------------------|---------------------|-------------------|
| **Feature Completeness** | 5 | 3 | 5 |
| **Development Effort** | 5 (zero work) | 1 (50-65 hours) | 3 (30-40 hours) |
| **Ongoing Maintenance** | 5 (low) | 2 (high) | 4 (medium) |
| **User Experience** | 3 (requires conversion) | 2 (confusing tiers) | 4 (guided) |
| **Target Market Fit** | 5 (business users) | 2 (split focus) | 5 (business users) |
| **Competitive Positioning** | 5 (industry standard) | 3 (unique but limited) | 5 (better UX) |
| **Revenue Potential** | 4 (pro users) | 3 (freemium dilution) | 4 (pro users) |
| **Technical Complexity** | 5 (simple) | 2 (complex) | 4 (moderate) |

### Total Scores:
- **Option A**: 37/40 (92.5%)
- **Option B**: 18/40 (45%)
- **Option C**: 34/40 (85%)

---

## Recommendation

### Primary Recommendation: **Option A (Status Quo)** ✅

**Rationale**:
1. **Feature Completeness**: Only option where all users get full comment management
2. **Zero Development Cost**: Already implemented and working
3. **Industry Standard**: Competitive parity with all major tools
4. **Clear Value Proposition**: Professional tool for business users
5. **Lower Maintenance Burden**: Single OAuth flow, single API

**Immediate Actions**:
1. Improve documentation/FAQ about Business account requirement
2. Add clear messaging on landing page: "For Instagram Business/Creator Accounts"
3. Create short tutorial video showing account conversion (< 2 minutes)
4. Add FAQ item: "Why do I need a Business account?"

**Cost**: Minimal (1-2 hours for documentation)

---

### Alternative Recommendation: **Option C (Hybrid)** ⚠️

**When to choose**:
- If user onboarding metrics show high drop-off due to account setup
- If significant user feedback indicates confusion about Business accounts
- If willing to invest 30-40 hours in enhanced UX

**Rationale**:
1. **Maintains full features** for all users (unlike Option B)
2. **Lowers friction** through guided wizard
3. **Educates users** on Business account benefits
4. **Competitive differentiator** (best onboarding in category)
5. **Reasonable investment** (30-40 hours vs 50-65)

**Phased Approach**:
- **Phase 1** (10 hours): Build basic wizard with step-by-step instructions
- **Phase 2** (15 hours): Add video tutorials and automated page creation
- **Phase 3** (10 hours): Implement real-time validation and progress tracking

---

### NOT Recommended: **Option B (Dual API)** ❌

**Why NOT to choose**:
1. **High development cost** (50-65 hours) for limited value
2. **Personal accounts can't use core features** (comments)
3. **Ongoing maintenance burden** (two OAuth flows, two APIs)
4. **Diluted value proposition** (confusing tiers)
5. **Split focus** (trying to serve two personas)
6. **Higher support costs** (explaining feature limitations)

**The Fatal Flaw**: Personal Instagram users can view their own media in the Instagram app for free. Oasify's value is comment management with AI, which Basic Display API doesn't support. You'd be building infrastructure for a feature set that doesn't provide user value.

---

## Implementation Roadmap

### If Choosing Option A (Recommended):

**Week 1**:
- [ ] Create FAQ page addressing Business account requirement
- [ ] Add clear messaging to homepage and signup flow
- [ ] Record 2-minute tutorial video: "How to Convert to Business Account"
- [ ] Add benefits explanation: "Why Business Account?"

**Total Effort**: 3-5 hours

---

### If Choosing Option C (Alternative):

**Week 1**: Basic Wizard (10 hours)
- [ ] Create wizard component structure
- [ ] Implement welcome and account check steps
- [ ] Add step-by-step conversion instructions
- [ ] Integrate with existing OAuth flow

**Week 2**: Enhanced Features (15 hours)
- [ ] Record and edit tutorial videos
- [ ] Implement automated page creation (if possible via API)
- [ ] Add real-time account validation
- [ ] Build progress tracking

**Week 3**: Polish & Testing (10 hours)
- [ ] User testing with personal account holders
- [ ] Refine wizard flow based on feedback
- [ ] Add analytics tracking for drop-off points
- [ ] Documentation and launch

**Total Effort**: 30-40 hours over 3 weeks

---

## Success Metrics

### Option A Metrics:
- **Onboarding Completion Rate**: % of users who successfully connect Instagram
- **Time to First Connection**: Minutes from signup to connected account
- **Support Tickets**: # of tickets about account setup (aim to decrease with better docs)

**Target**: >70% completion rate, <10 minutes average time

### Option C Metrics:
- **Wizard Completion Rate**: % of users who complete all wizard steps
- **Conversion Success Rate**: % of personal users who successfully convert to Business
- **Time in Wizard**: Average time spent in onboarding wizard
- **Drop-off Points**: Which step has highest abandonment

**Target**: >80% wizard completion, >60% conversion success, <15 minutes average time

---

## User Communication Strategy

### Messaging for Landing Page

**Option A**:
> "Oasify helps Instagram creators and businesses manage comments with AI-powered empathetic responses. Connect your Instagram Business or Creator account to get started."

**Option C**:
> "Oasify helps Instagram creators and businesses manage comments with AI-powered empathetic responses. We'll guide you through a quick setup to connect your Instagram account."

### FAQ Item

**Q: Why do I need an Instagram Business or Creator account?**

A: Instagram's API only provides access to comments for Business and Creator accounts. This is Meta's policy, not ours! The good news:
- Converting is **free** and takes 2 minutes
- It's **completely reversible** (switch back anytime)
- You'll get **additional Instagram features** (analytics, insights, contact button)
- We provide a **step-by-step guide** to make setup easy

Don't have a Business account yet? No problem! We'll walk you through the conversion process during signup. [Watch our 2-minute tutorial →]

---

## Technical Appendix

### Current OAuth Flow Diagram

```
User clicks "Connect Instagram"
  ↓
Redirect to Facebook OAuth (v21.0)
  ↓
User authorizes app (pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_comments)
  ↓
Facebook returns authorization code
  ↓
Exchange code for short-lived user token (1 hour)
  ↓
Exchange short-lived for long-lived user token (60 days)
  ↓
Fetch user's Facebook Pages
  ↓
For each page, check for Instagram Business Account connection
  ↓
Select page with Instagram (currently: first match)
  ↓
Store page access token (permanent, unless revoked)
  ↓
Store Instagram Business Account ID
  ↓
Return to Oasify dashboard
```

### Environment Variables Reference

```bash
# Current (Option A)
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_REDIRECT_URI=http://localhost:5173/oauth/facebook/callback

# Additional for Option B
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
INSTAGRAM_REDIRECT_URI=http://localhost:5173/oauth/instagram/callback

# Additional for Option C
# (no new variables needed)
```

### Rate Limits

**Graph API (Business Accounts)**:
- **200 calls per hour per user** (default)
- Can request higher limits after app review
- Page tokens have higher limits than user tokens

**Basic Display API (Personal Accounts)**:
- **200 calls per hour per user** (fixed)
- Cannot request increases
- Lower priority in Meta's infrastructure

---

## Conclusion

The Instagram API landscape requires careful consideration of trade-offs between **feature completeness**, **development effort**, and **user experience**.

**Key Insights**:

1. **The Comment Management Requirement**: Oasify's core value (AI empathetic comment responses) requires Instagram Graph API, which mandates Business/Creator accounts + Facebook Pages

2. **No True "Personal Account Support"**: Instagram Basic Display API cannot access comments, making it unsuitable for Oasify's use case

3. **Industry Standard Approach**: All professional Instagram tools (Hootsuite, Buffer, Sprout Social) require Business accounts - this isn't a limitation unique to Oasify

4. **The Facebook Page "Tax"**: While the Facebook Page requirement may seem arbitrary, it's Meta's architectural decision for business API access and cannot be bypassed

**Final Recommendation**:

**Start with Option A** (status quo with improved documentation) because:
- ✅ Zero development cost
- ✅ Full feature access for all users
- ✅ Industry-standard approach
- ✅ Clear value proposition

**Upgrade to Option C** if/when:
- User onboarding metrics show significant drop-off
- Support burden from setup confusion becomes high
- Resources available for 30-40 hour investment

**Avoid Option B** because:
- ❌ High cost (50-65 hours) for minimal user value
- ❌ Personal accounts can't access core features anyway
- ❌ Ongoing maintenance complexity

---

## Next Steps

1. **Review this document** with stakeholders
2. **Decide on option** (A or C recommended)
3. **If Option A**: Create documentation and tutorials (3-5 hours)
4. **If Option C**: Plan 3-week development sprint (30-40 hours)
5. **Set success metrics** and tracking
6. **Launch** and monitor user feedback
7. **Iterate** based on data

---

**Document Prepared**: January 2025
**Status**: Pending decision
**Owner**: Development team
