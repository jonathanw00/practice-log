// Shared by functions/api/stats.js and functions/api/day.js.
// Filename starts with _ so Cloudflare Pages Functions doesn't treat it as a route.

// start_time/end_time are always "HH:MM" (from <input type="time">), so we
// can convert to minutes-since-midnight with substr arithmetic. Rows missing
// either time (or where end < start) contribute 0.
export const MINUTES_EXPR = `
  CASE WHEN start_time IS NOT NULL AND start_time != '' AND end_time IS NOT NULL AND end_time != '' THEN
    MAX(0,
      (CAST(substr(end_time,1,2) AS INTEGER)*60 + CAST(substr(end_time,4,2) AS INTEGER)) -
      (CAST(substr(start_time,1,2) AS INTEGER)*60 + CAST(substr(start_time,4,2) AS INTEGER))
    )
  ELSE 0 END
`;

// A row is only "about" an activity if that activity's fields were actually
// filled in — the technique/repertoire JSON blobs always contain every key,
// mostly empty, since one row = one micro-entry logging just one activity.
//
// `pieces` is an array of { name, bpmstart?, bpmend?, measures? } — the
// multi-select piece picker shape used by Technical piece / Traditionally
// notated / Lead sheet. Older rows instead have a single `keyname` (technical
// pieces) or `measures` (repertoire) at the top level; both are still checked
// so history predating the picker still renders correctly.
export function hasPieces(v) {
  return Array.isArray(v && v.pieces) && v.pieces.some(p => nonEmpty(p && p.name));
}

export function deriveLabel(techniqueJson, repertoireJson) {
  const labels = [];
  try {
    const tech = JSON.parse(techniqueJson || '{}');
    for (const [name, v] of Object.entries(tech)) {
      const hasKeys = Array.isArray(v && v.keys) && v.keys.length > 0;
      if (v && (hasKeys || hasPieces(v) || nonEmpty(v.scaleType) || nonEmpty(v.keyname) || nonEmpty(v.bpmstart) || nonEmpty(v.bpmend) || nonEmpty(v.notes))) {
        labels.push(name);
      }
    }
  } catch (e) { /* malformed json, skip */ }
  try {
    const rep = JSON.parse(repertoireJson || '{}');
    for (const [name, v] of Object.entries(rep)) {
      if (v && (hasPieces(v) || nonEmpty(v.measures) || nonEmpty(v.notes))) {
        labels.push(name);
      }
    }
  } catch (e) { /* malformed json, skip */ }
  return labels.length ? labels.join(', ') : 'Session';
}

export function nonEmpty(val) {
  return val !== undefined && val !== null && String(val).trim() !== '';
}

export function corsHeaders(methods) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, X-App-Password"
  };
}

export function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors }
  });
}
