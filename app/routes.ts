import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),
  route("dashboard", "routes/dashboard-layout.tsx", [
    index("routes/dashboard.tsx"),
    route("analytics", "routes/dashboard.analytics.tsx"),
    route("settings", "routes/dashboard.settings.tsx"),
  ]),
  route("oauth/google/start", "routes/oauth.google.start.tsx"),
  route("oauth/google/callback", "routes/oauth.google.callback.tsx"),
  route("oauth/youtube", "routes/oauth.youtube.tsx"),
  route("oauth/instagram", "routes/oauth.instagram.tsx"),
  route("api/providers", "routes/api.providers.tsx"),
  route("api/youtube/comments", "routes/api.youtube.comments.tsx"),
  route(".well-known/appspecific/com.chrome.devtools.json", "routes/.well-known.appspecific.com.chrome.devtools.json.ts"),
] satisfies RouteConfig;
