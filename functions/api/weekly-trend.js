import { MINUTES_EXPR, corsHeaders, json } from '../_lib.js';

// Total practice minutes per calendar week (Sunday-start, matching the
// "This week" stat on the main page), for the last N weeks including the
// current one. Bucketing happens here rather than in SQL since SQLite's
// date functions don't have a clean "week start" primitive.
export async function onRequest(context) {
  const { request, env } = context;
  const db = env.practice_log;
  const url = new URL(request.url);
  const cors = corsHeaders("GET, OPTIONS");

  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "GET") return json({ error: "method not allowed" }, cors, 405);

  try {
    const todayStr = url.searchParams.get("today");
    if (!todayStr) return json({ error: "today query param required" }, cors, 400);
    const weeks = Math.min(26, Math.max(1, parseInt(url.searchParams.get("weeks"), 10) || 12));

    const { results } = await db.prepare(
      `SELECT session_date, (${MINUTES_EXPR}) as mins FROM sessions`
    ).all();

    const today = new Date(todayStr + 'T00:00:00Z');
    const dow = today.getUTCDay();
    const thisWeekStart = new Date(today);
    thisWeekStart.setUTCDate(today.getUTCDate() - dow);

    const bucketStarts = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date(thisWeekStart);
      d.setUTCDate(thisWeekStart.getUTCDate() - i * 7);
      bucketStarts.push(d.toISOString().slice(0, 10));
    }
    const bucketMins = new Map(bucketStarts.map(s => [s, 0]));

    for (const row of results || []) {
      if (!row.session_date) continue;
      const d = new Date(row.session_date + 'T00:00:00Z');
      const start = new Date(d);
      start.setUTCDate(d.getUTCDate() - d.getUTCDay());
      const key = start.toISOString().slice(0, 10);
      if (bucketMins.has(key)) bucketMins.set(key, bucketMins.get(key) + (row.mins || 0));
    }

    const weeksOut = bucketStarts.map(s => ({ weekStart: s, minutes: bucketMins.get(s) }));
    return json({ weeks: weeksOut }, cors);
  } catch (err) {
    return json({ error: err.message }, cors, 500);
  }
}
