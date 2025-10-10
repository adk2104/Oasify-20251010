import type { Route } from "./+types/.well-known.appspecific.com.chrome.devtools.json";

export async function loader({ request }: Route.LoaderArgs) {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
