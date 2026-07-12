import { corsHeaders, json } from '../_lib.js';

// Shared list backing the Technical piece / Traditionally notated / Lead
// sheet chip pickers. `category` keeps the pickers scoped so a growing
// repertoire song list never mixes in technical-exercise pieces or vice versa.
export async function onRequest(context) {
  const { request, env } = context;
  const db = env.practice_log;
  const url = new URL(request.url);

  const cors = corsHeaders("GET, POST, OPTIONS");

  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    if (request.method === "GET") {
      const category = url.searchParams.get("category") || "technical";
      const { results } = await db.prepare(
        "SELECT id, name, category FROM pieces WHERE category = ? ORDER BY name ASC"
      ).bind(category).all();
      return json(results, cors);
    }

    if (request.method === "POST") {
      const b = await request.json();
      const name = (b.name || '').trim();
      const category = b.category || 'technical';
      if (!name) return json({ error: "name required" }, cors, 400);
      // Idempotent add: if it already exists in this category, just return the existing row.
      await db.prepare("INSERT OR IGNORE INTO pieces (name, category) VALUES (?, ?)").bind(name, category).run();
      const row = await db.prepare("SELECT id, name, category FROM pieces WHERE name = ? AND category = ?").bind(name, category).first();
      return json(row, cors);
    }

    return json({ error: "method not allowed" }, cors, 405);
  } catch (err) {
    return json({ error: err.message }, cors, 500);
  }
}
