import { MINUTES_EXPR, deriveLabel, corsHeaders, json } from '../_lib.js';

// Powers the History view — same shape of data as "today" in stats.js,
// but for a date the user picks rather than always the current day.
export async function onRequest(context) {
  const { request, env } = context;
  const db = env.practice_log;
  const url = new URL(request.url);

  const cors = corsHeaders("GET, OPTIONS");

  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "GET") return json({ error: "method not allowed" }, cors, 405);

  try {
    const date = url.searchParams.get("date");
    if (!date) return json({ error: "date query param required" }, cors, 400);

    const [minutesRow, rows] = await Promise.all([
      db.prepare(`SELECT COALESCE(SUM(${MINUTES_EXPR}),0) as minutes FROM sessions WHERE session_date = ?`).bind(date).first(),
      db.prepare(`SELECT id, start_time, technique_json, repertoire_json FROM sessions WHERE session_date = ? ORDER BY start_time ASC`).bind(date).all()
    ]);

    const entries = (rows.results || []).map(row => ({
      id: row.id,
      start_time: row.start_time,
      label: deriveLabel(row.technique_json, row.repertoire_json)
    }));

    return json({ minutes: minutesRow?.minutes || 0, entries }, cors);
  } catch (err) {
    return json({ error: err.message }, cors, 500);
  }
}
