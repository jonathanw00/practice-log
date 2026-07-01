export async function onRequest(context) {
  const { request, env } = context;
  const db = env.practice_log;

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-App-Password"
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    if (request.method === "GET") {
      const { results } = await db.prepare("SELECT id, name FROM technical_pieces ORDER BY name ASC").all();
      return json(results, cors);
    }

    if (request.method === "POST") {
      const b = await request.json();
      const name = (b.name || '').trim();
      if (!name) return json({ error: "name required" }, cors, 400);
      // Idempotent add: if it already exists, just return the existing row.
      await db.prepare("INSERT OR IGNORE INTO technical_pieces (name) VALUES (?)").bind(name).run();
      const row = await db.prepare("SELECT id, name FROM technical_pieces WHERE name = ?").bind(name).first();
      return json(row, cors);
    }

    return json({ error: "method not allowed" }, cors, 405);
  } catch (err) {
    return json({ error: err.message }, cors, 500);
  }
}

function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors }
  });
}
