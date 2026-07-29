import { corsHeaders, json } from '../_lib.js';

// The reflective half of the template's Weekly Summary & Instructor
// Communication section. Total hours / categories aren't stored — the range
// report already computes those from the sessions themselves.
//
// GET  /api/weekly-reflection?week_start=YYYY-MM-DD
//      -> the row, or nulled-out fields if that week has none yet.
// PUT  body { week_start, key_achievement, primary_challenge,
//             measures_for_review, questions_for_instructor }
//      -> upsert by week_start, returns the stored row.
//
// week_start is always a Sunday, matching the Sun-Sat ranges the export
// panel's "Last week" / "This week" buttons produce. Past weeks are editable,
// not just the current one.
export async function onRequest(context) {
  const { request, env } = context;
  const db = env.practice_log;
  const url = new URL(request.url);

  const cors = corsHeaders("GET, PUT, OPTIONS");

  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    if (request.method === "GET") {
      const weekStart = url.searchParams.get("week_start") || '';
      if (!isDate(weekStart)) return json({ error: "week_start (YYYY-MM-DD) required" }, cors, 400);
      const row = await readWeek(db, weekStart);
      return json(row || emptyWeek(weekStart), cors);
    }

    if (request.method === "PUT") {
      const b = await request.json();
      const weekStart = (b.week_start || '').trim();
      if (!isDate(weekStart)) return json({ error: "week_start (YYYY-MM-DD) required" }, cors, 400);

      await db.prepare(`
        INSERT INTO weekly_reflections
          (week_start, key_achievement, primary_challenge, measures_for_review, questions_for_instructor, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(week_start) DO UPDATE SET
          key_achievement = excluded.key_achievement,
          primary_challenge = excluded.primary_challenge,
          measures_for_review = excluded.measures_for_review,
          questions_for_instructor = excluded.questions_for_instructor,
          updated_at = datetime('now')
      `).bind(
        weekStart,
        str(b.key_achievement),
        str(b.primary_challenge),
        str(b.measures_for_review),
        str(b.questions_for_instructor)
      ).run();

      return json(await readWeek(db, weekStart), cors);
    }

    return json({ error: "method not allowed" }, cors, 405);
  } catch (err) {
    return json({ error: err.message }, cors, 500);
  }
}

function readWeek(db, weekStart) {
  return db.prepare(`
    SELECT week_start, key_achievement, primary_challenge, measures_for_review,
           questions_for_instructor, updated_at
    FROM weekly_reflections WHERE week_start = ?
  `).bind(weekStart).first();
}

// A week with no row yet reads back as empty fields rather than a 404, so the
// client can treat "never written" and "written but blank" the same way.
function emptyWeek(weekStart) {
  return {
    week_start: weekStart,
    key_achievement: '',
    primary_challenge: '',
    measures_for_review: '',
    questions_for_instructor: ''
  };
}

function isDate(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v || '');
}

function str(v) {
  return v === undefined || v === null ? '' : String(v);
}
