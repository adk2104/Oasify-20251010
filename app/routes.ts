import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route(".well-known/appspecific/com.chrome.devtools.json", "routes/.well-known.appspecific.com.chrome.devtools.json.ts"),
] satisfies RouteConfig;
