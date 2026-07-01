// Computes practice-time stats (minutes) via SQL aggregates rather than
// pulling full history into the worker — stays fast as entries pile up.
export async function onRequest(context) {
  const { request, env } = context;
  const db = env.practice_log;
  const url = new URL(request.url);

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "GET") return json({ error: "method not allowed" }, cors, 405);

  try {
    const date = url.searchParams.get("date");
    const weekStart = url.searchParams.get("weekStart");
    const weekEnd = url.searchParams.get("weekEnd");
    if (!date || !weekStart || !weekEnd) {
      return json({ error: "date, weekStart, weekEnd query params required" }, cors, 400);
    }

    // start_time/end_time are always "HH:MM" (from <input type="time">),
    // so we can convert to minutes-since-midnight with substr arithmetic.
    // Rows missing either time (or where end < start) contribute 0.
    const minutesExpr = `
      CASE WHEN start_time IS NOT NULL AND start_time != '' AND end_time IS NOT NULL AND end_time != '' THEN
        MAX(0,
          (CAST(substr(end_time,1,2) AS INTEGER)*60 + CAST(substr(end_time,4,2) AS INTEGER)) -
          (CAST(substr(start_time,1,2) AS INTEGER)*60 + CAST(substr(start_time,4,2) AS INTEGER))
        )
      ELSE 0 END
    `;

    const [todayRow, weekRow, allTimeRow, todayEntries] = await Promise.all([
      db.prepare(`SELECT COALESCE(SUM(${minutesExpr}),0) as minutes FROM sessions WHERE session_date = ?`).bind(date).first(),
      db.prepare(`SELECT COALESCE(SUM(${minutesExpr}),0) as minutes FROM sessions WHERE session_date BETWEEN ? AND ?`).bind(weekStart, weekEnd).first(),
      db.prepare(`SELECT COALESCE(SUM(${minutesExpr}),0) as minutes FROM sessions`).first(),
      db.prepare(`SELECT start_time, technique_json, repertoire_json FROM sessions WHERE session_date = ? ORDER BY start_time ASC`).bind(date).all()
    ]);

    const entries = (todayEntries.results || []).map(row => ({
      start_time: row.start_time,
      label: deriveLabel(row.technique_json, row.repertoire_json)
    }));

    return json({
      todayMinutes: todayRow?.minutes || 0,
      weekMinutes: weekRow?.minutes || 0,
      allTimeMinutes: allTimeRow?.minutes || 0,
      todayEntries: entries
    }, cors);
  } catch (err) {
    return json({ error: err.message }, cors, 500);
  }
}

// A row is only "about" an activity if that activity's fields were actually
// filled in — the technique/repertoire JSON blobs always contain every key,
// mostly empty, since one row = one micro-entry logging just one activity.
function deriveLabel(techniqueJson, repertoireJson) {
  const labels = [];
  try {
    const tech = JSON.parse(techniqueJson || '{}');
    for (const [name, v] of Object.entries(tech)) {
      if (v && (nonEmpty(v.keyname) || nonEmpty(v.bpmstart) || nonEmpty(v.bpmend) || nonEmpty(v.notes))) {
        labels.push(name);
      }
    }
  } catch (e) { /* malformed json, skip */ }
  try {
    const rep = JSON.parse(repertoireJson || '{}');
    for (const [name, v] of Object.entries(rep)) {
      if (v && (nonEmpty(v.measures) || nonEmpty(v.notes))) {
        labels.push(name);
      }
    }
  } catch (e) { /* malformed json, skip */ }
  return labels.length ? labels.join(', ') : 'Session';
}

function nonEmpty(val) {
  return val !== undefined && val !== null && String(val).trim() !== '';
}

function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors }
  });
}
