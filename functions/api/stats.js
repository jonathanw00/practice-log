import { MINUTES_EXPR, deriveLabel, computeStreak, corsHeaders, json } from '../_lib.js';

// Computes practice-time stats (minutes) via SQL aggregates rather than
// pulling full history into the worker — stays fast as entries pile up.
export async function onRequest(context) {
  const { request, env } = context;
  const db = env.practice_log;
  const url = new URL(request.url);

  const cors = corsHeaders("GET, OPTIONS");

  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "GET") return json({ error: "method not allowed" }, cors, 405);

  try {
    const date = url.searchParams.get("date");
    const weekStart = url.searchParams.get("weekStart");
    const weekEnd = url.searchParams.get("weekEnd");
    if (!date || !weekStart || !weekEnd) {
      return json({ error: "date, weekStart, weekEnd query params required" }, cors, 400);
    }

    // Previous week = the seven days immediately before weekStart, derived here
    // so the client doesn't need to pass extra params. UTC math avoids DST drift.
    const ws = new Date(weekStart + "T00:00:00Z");
    const prevEndDate = new Date(ws); prevEndDate.setUTCDate(ws.getUTCDate() - 1);
    const prevStartDate = new Date(ws); prevStartDate.setUTCDate(ws.getUTCDate() - 7);
    const prevWeekStart = prevStartDate.toISOString().slice(0, 10);
    const prevWeekEnd = prevEndDate.toISOString().slice(0, 10);

    const [todayRow, weekRow, prevWeekRow, allTimeRow, todayEntries, practiceDates] = await Promise.all([
      db.prepare(`SELECT COALESCE(SUM(${MINUTES_EXPR}),0) as minutes FROM sessions WHERE session_date = ?`).bind(date).first(),
      db.prepare(`SELECT COALESCE(SUM(${MINUTES_EXPR}),0) as minutes FROM sessions WHERE session_date BETWEEN ? AND ?`).bind(weekStart, weekEnd).first(),
      db.prepare(`SELECT COALESCE(SUM(${MINUTES_EXPR}),0) as minutes FROM sessions WHERE session_date BETWEEN ? AND ?`).bind(prevWeekStart, prevWeekEnd).first(),
      db.prepare(`SELECT COALESCE(SUM(${MINUTES_EXPR}),0) as minutes FROM sessions`).first(),
      db.prepare(`SELECT id, start_time, technique_json, repertoire_json FROM sessions WHERE session_date = ? ORDER BY start_time ASC`).bind(date).all(),
      db.prepare(`SELECT DISTINCT session_date FROM sessions WHERE (${MINUTES_EXPR}) > 0 ORDER BY session_date DESC LIMIT 400`).all()
    ]);

    const entries = (todayEntries.results || []).map(row => ({
      id: row.id,
      start_time: row.start_time,
      label: deriveLabel(row.technique_json, row.repertoire_json)
    }));

    const streakDays = computeStreak((practiceDates.results || []).map(r => r.session_date), date);

    return json({
      todayMinutes: todayRow?.minutes || 0,
      weekMinutes: weekRow?.minutes || 0,
      prevWeekMinutes: prevWeekRow?.minutes || 0,
      allTimeMinutes: allTimeRow?.minutes || 0,
      streakDays,
      todayEntries: entries
    }, cors);
  } catch (err) {
    return json({ error: err.message }, cors, 500);
  }
}
