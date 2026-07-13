import { hasPieces, nonEmpty, corsHeaders, json } from '../_lib.js';

// BPM trend per technical piece — earliest and latest logged BPM across all
// sessions that piece was practiced in, in chronological order.
export async function onRequest(context) {
  const { request, env } = context;
  const db = env.practice_log;
  const cors = corsHeaders("GET, OPTIONS");

  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "GET") return json({ error: "method not allowed" }, cors, 405);

  try {
    const { results } = await db.prepare(
      `SELECT session_date, start_time, technique_json FROM sessions ORDER BY session_date ASC, start_time ASC`
    ).all();

    const byPiece = new Map(); // name -> [{date, bpmstart, bpmend}], chronological
    for (const row of results || []) {
      let tech;
      try { tech = JSON.parse(row.technique_json || '{}'); } catch (e) { continue; }
      for (const v of Object.values(tech)) {
        if (!hasPieces(v)) continue;
        for (const p of v.pieces) {
          if (!nonEmpty(p && p.name)) continue;
          if (!nonEmpty(p.bpmstart) && !nonEmpty(p.bpmend)) continue;
          const list = byPiece.get(p.name) || [];
          list.push({ date: row.session_date, bpmstart: p.bpmstart, bpmend: p.bpmend });
          byPiece.set(p.name, list);
        }
      }
    }

    const pieces = Array.from(byPiece.entries()).map(([name, list]) => {
      const first = list[0];
      const last = list[list.length - 1];
      const earliestBpm = Number(nonEmpty(first.bpmstart) ? first.bpmstart : first.bpmend);
      const latestBpm = Number(nonEmpty(last.bpmend) ? last.bpmend : last.bpmstart);
      return {
        name,
        sessionCount: list.length,
        earliestBpm,
        latestBpm,
        earliestDate: first.date,
        latestDate: last.date
      };
    }).sort((a, b) => b.latestDate.localeCompare(a.latestDate));

    return json({ pieces }, cors);
  } catch (err) {
    return json({ error: err.message }, cors, 500);
  }
}
