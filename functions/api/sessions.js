import { corsHeaders, json } from '../_lib.js';

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.practice_log;
  const url = new URL(request.url);
  const method = request.method;

  const cors = corsHeaders("GET, POST, PUT, DELETE, OPTIONS");

  if (method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    if (method === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        const row = await db.prepare("SELECT * FROM sessions WHERE id = ?").bind(id).first();
        return json(row || null, cors);
      }
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);
      const { results } = await db
        .prepare("SELECT * FROM sessions ORDER BY session_date DESC, session_num ASC LIMIT ?")
        .bind(limit).all();
      return json(results, cors);
    }

    if (method === "POST") {
      const b = await request.json();
      const result = await db.prepare(
        "INSERT INTO sessions (session_date, start_time, end_time, session_num, energy, recording, win, technique_json, repertoire_json) VALUES (?,?,?,?,?,?,?,?,?)"
      ).bind(
        b.session_date, b.start_time, b.end_time || null,
        b.session_num || 1, b.energy || 'good', b.recording ? 1 : 0, b.win || null,
        JSON.stringify(b.technique_json || {}),
        JSON.stringify(b.repertoire_json || {})
      ).run();
      return json({ id: result.meta.last_row_id }, cors);
    }

    if (method === "PUT") {
      const b = await request.json();
      if (!b.id) return json({ error: "id required" }, cors, 400);
      await db.prepare(
        "UPDATE sessions SET session_date=?, start_time=?, end_time=?, session_num=?, energy=?, recording=?, win=?, technique_json=?, repertoire_json=?, updated_at=datetime('now') WHERE id=?"
      ).bind(
        b.session_date, b.start_time, b.end_time || null,
        b.session_num || 1, b.energy || 'good', b.recording ? 1 : 0, b.win || null,
        JSON.stringify(b.technique_json || {}),
        JSON.stringify(b.repertoire_json || {}),
        b.id
      ).run();
      return json({ ok: true }, cors);
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "id required" }, cors, 400);
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
      return json({ ok: true }, cors);
    }

    return json({ error: "method not allowed" }, cors, 405);
  } catch(err) {
    return json({ error: err.message }, cors, 500);
  }
}
