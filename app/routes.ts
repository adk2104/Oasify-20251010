import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/landing.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("verify", "routes/verify.tsx"),
  route("terms", "routes/terms.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("delete-data", "routes/delete-data.tsx"),
  route("dashboard", "routes/dashboard-layout.tsx", [
    index("routes/dashboard.tsx"),
    route("analytics", "routes/dashboard.analytics.tsx"),
    route("settings", "routes/dashboard.settings.tsx"),
  ]),
  route("oauth/google/start", "routes/oauth.google.start.tsx"),
  route("oauth/google/callback", "routes/oauth.google.callback.tsx"),
  route("oauth/youtube", "routes/oauth.youtube.tsx"),
  route("oauth/instagram", "routes/oauth.instagram.tsx"),
  route("oauth/instagram/callback", "routes/oauth.instagram.callback.tsx"),
  route("api/providers", "routes/api.providers.tsx"),
  route("api/youtube/comments", "routes/api.youtube.comments.tsx"),
  route("api/instagram/comments", "routes/api.instagram.comments.tsx"),
  route("api/comments/reply", "routes/api.comments.reply.tsx"),
  route(".well-known/appspecific/com.chrome.devtools.json", "routes/.well-known.appspecific.com.chrome.devtools.json.ts"),
] satisfies RouteConfig;
