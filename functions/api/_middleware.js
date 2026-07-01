// Runs before every /api/* request. Cloudflare Pages Functions middleware
// convention: exporting onRequest from _middleware.js applies it to this
// whole directory, so individual route files don't each need their own
// auth check — one place to maintain it.
export async function onRequest(context) {
  const { request, env, next } = context;

  // Preflight requests never carry the custom auth header (browsers block
  // custom headers on OPTIONS), so let them through to the route's own
  // OPTIONS handler, which just returns CORS headers.
  if (request.method === "OPTIONS") return next();

  const provided = request.headers.get("X-App-Password") || "";
  if (!env.APP_PASSWORD || provided !== env.APP_PASSWORD) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  return next();
}
