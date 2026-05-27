import { getRouteGraph } from "../lib/router";

export async function GET() {
  const graph = await getRouteGraph();

  return new Response(JSON.stringify(graph, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
