import { corsHeaders, json } from '../_lib.js';

// The semester overview from the instructor's template: label, instructor,
// goals, technical requirements — plus which pieces are assigned this
// semester. Assigned pieces are the `assigned` flag on the pieces table, not
// a list stored here, so the semester panel and the chip pickers can never
// disagree about what a piece is called.
//
// GET  -> { profile: {...}, pieces: [{ id, name, category, assigned }] }
// PUT  -> body may carry the four profile fields and/or `assigned_ids`
//         (the complete set of assigned piece ids — anything absent is
//         cleared). Returns the same shape as GET.
export async function onRequest(context) {
  const { request, env } = context;
  const db = env.practice_log;

  const cors = corsHeaders("GET, PUT, OPTIONS");

  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    if (request.method === "GET") return json(await readAll(db), cors);

    if (request.method === "PUT") {
      const b = await request.json();

      // Upsert the single row. COALESCE(excluded.x, semester_profile.x) leaves
      // any field the client didn't send untouched instead of nulling it.
      await db.prepare(`
        INSERT INTO semester_profile (id, semester_label, instructor_name, goals, technical_requirements, updated_at)
        VALUES (1, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          semester_label = COALESCE(excluded.semester_label, semester_profile.semester_label),
          instructor_name = COALESCE(excluded.instructor_name, semester_profile.instructor_name),
          goals = COALESCE(excluded.goals, semester_profile.goals),
          technical_requirements = COALESCE(excluded.technical_requirements, semester_profile.technical_requirements),
          updated_at = datetime('now')
      `).bind(
        fieldOrNull(b.semester_label),
        fieldOrNull(b.instructor_name),
        fieldOrNull(b.goals),
        fieldOrNull(b.technical_requirements)
      ).run();

      // assigned_ids is authoritative when present: clear everything, then set
      // the listed ids. Omitting the key entirely leaves assignments alone.
      if (Array.isArray(b.assigned_ids)) {
        const ids = b.assigned_ids.map(Number).filter(Number.isInteger);
        const stmts = [db.prepare("UPDATE pieces SET assigned = 0 WHERE assigned = 1")];
        if (ids.length) {
          const placeholders = ids.map(() => '?').join(',');
          stmts.push(db.prepare(`UPDATE pieces SET assigned = 1 WHERE id IN (${placeholders})`).bind(...ids));
        }
        await db.batch(stmts);
      }

      return json(await readAll(db), cors);
    }

    return json({ error: "method not allowed" }, cors, 405);
  } catch (err) {
    return json({ error: err.message }, cors, 500);
  }
}

async function readAll(db) {
  const profile = await db.prepare(
    "SELECT semester_label, instructor_name, goals, technical_requirements, updated_at FROM semester_profile WHERE id = 1"
  ).first();
  const { results } = await db.prepare(
    "SELECT id, name, category, assigned FROM pieces ORDER BY category ASC, name ASC"
  ).all();
  return {
    profile: profile || { semester_label: '', instructor_name: '', goals: '', technical_requirements: '' },
    pieces: results
  };
}

// Absent field -> null so COALESCE keeps the stored value; a sent-but-empty
// field -> '' so clearing a field actually clears it.
function fieldOrNull(v) {
  return v === undefined ? null : String(v);
}
