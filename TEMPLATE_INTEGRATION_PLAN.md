# Practice Log — Instructor Template Integration Plan

Drafted from a discussion comparing the instructor's 15-Week Undergraduate Piano
Practice Log template against the current app (Cloudflare Pages + D1, in this
repo). This is a **design doc, not implemented yet** — nothing here has been
built. Intent is to review/adjust before any code changes.

## Decisions

| Template element | Decision | Why |
|---|---|---|
| Four fixed 45–60 min daily sessions (Technical Foundations, Traditionally Notated, Lead Sheet & Improvisation, Mastery & Synthesis) | **Keep current flexible session model** (any number of ad-hoc sessions/day, `session_num` counter) | Template assumes 3–4 hrs/day; actual target is 2 hrs/day. Forcing four fixed slots would create empty, unused UI most days. |
| Session 4: **Mastery & Synthesis** | **Deferred** — do not add a category yet | Not clearly understood what it entails (likely a no-stopping performance run-through, but that's a guess). Ask instructor for a concrete definition before modeling it. |
| Technique table: Keys/Focus Area, Target BPM/Grouping, Progress Notes | **No change** — already covered by existing key-grid (Scales/Arpeggios/Chord progressions × 12 keys × Major/Minor) + BPM field on Technical piece | Existing structure already captures this; template doesn't add anything new here. |
| Repertoire table: Measure Ranges, Tempo/Metronome, **Memory Work** | **Add a "Played from memory" toggle** to repertoire piece entries (Traditionally Notated / Lead Sheet) | Concrete, low-friction, binary fact — doesn't require new vocabulary or judgment calls the way the fields below do. |
| Lead Sheet table: **Harmonic Texture**, **Improvisation Goals** | **Deferred** — keep as free-text in the existing notes field, not dedicated fields | These are concepts the student doesn't have working vocabulary for yet. Premature structured fields would sit unused/confusing. Revisit once these become concrete through lessons. |
| Semester Overview (goals, assigned repertoire, technical requirements, instructor name) | **Add** — a single editable semester profile, separate from daily sessions | Wanted, and useful once the weekly reflection needs something to reference against. |
| — "Assigned Repertoire" specifically | Tie to the **existing `pieces` table** via an `assigned` flag, not a second free-text list | Avoids two lists of pieces going out of sync — one source of truth. |
| Weekly Summary & Instructor Communication (Total Hours, Key Achievement, Primary Technical Challenge, Specific Measures for Review, Questions for Instructor) | **Add a Weekly Reflection**: one entry per calendar week (**Sunday–Saturday**, matching the existing "Last week"/"This week" export buttons). Surface it at the top of the existing PDF export when the report range matches a stored week. | Total Hours/categories are already computed by the existing report — no need to hand-enter those. The rest (achievement, challenge, review items, questions) is reflective synthesis the data can't generate on its own, and it's meant to eventually be shareable with the instructor — the existing PDF export is the natural delivery mechanism, not a new report feature. |
| Sight Reading / Listening Assignments (exist in app, not in template) | **No change** | Already hidden from output when empty (`isJunk` check); fine to leave as optional/future categories. |

## Proposed schema changes (not yet applied)

```sql
-- 1. Memory Work: add to the per-piece JSON already stored in
--    sessions.repertoire_json — no migration needed, just a new key
--    ("memory": true/false) alongside the existing measures/notes/bpm
--    fields for Traditionally Notated / Lead Sheet entries.

-- 2. Assigned flag on existing pieces table
ALTER TABLE pieces ADD COLUMN assigned INTEGER DEFAULT 0;

-- 3. Semester profile — single-row settings table
CREATE TABLE IF NOT EXISTS semester_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  semester_label TEXT,
  instructor_name TEXT,
  goals TEXT,
  technical_requirements TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Weekly reflection — one row per Sun–Sat week
CREATE TABLE IF NOT EXISTS weekly_reflections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL UNIQUE,       -- the Sunday's date, e.g. '2026-07-26'
  key_achievement TEXT,
  primary_challenge TEXT,
  measures_for_review TEXT,
  questions_for_instructor TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## Proposed UI/API touch points (not yet built)

- `functions/api/semester.js` — GET/PUT the single semester profile row.
- `functions/api/weekly-reflection.js` — GET/PUT a reflection by `week_start`.
- `public/index.html`:
  - Small "Played from memory" toggle on Traditionally Notated / Lead Sheet piece entries.
  - New small semester-profile panel (editable header or separate small view) reading/writing `semester_profile`.
  - New "Weekly reflection" panel — likely near the existing export panel, since it's keyed to the same Sun–Sat ranges — reading/writing `weekly_reflections` by `week_start`.
  - `buildRangeReport()` — when `start`/`end` exactly match a stored `week_start`/week-end, prepend the reflection's four fields above the existing "Session detail" section.
- Pieces UI: surface the `assigned` flag somewhere (e.g. a small marker on assigned pieces), and let the semester profile's "assigned repertoire" pull from/mark entries in the existing pieces list rather than duplicating names.

## Explicitly out of scope for now

- Mastery & Synthesis session/category (pending instructor clarification).
- Dedicated Harmonic Texture / Improvisation Goals fields (staying in notes).
- Any change to the flexible, ad-hoc session structure.
- Any change to Sight Reading / Listening Assignments.

## Open items for the next pass

- Exact copy/labels for the semester profile and weekly reflection UI.
- Whether `weekly_reflections` should be editable retroactively for past weeks, or only for the current week.
- Whether "assigned" pieces need any visual distinction elsewhere (e.g. the class chart export) or just in the semester profile view.
