'use strict';

// ── College-level analytics ───────────────────────────────────────────────────

const COLLEGE_ANALYTICS_QUERY = `
  SELECT
    COUNT(DISTINCT te.ticket_id)                                        AS total_registrations,
    COUNT(DISTINCT CASE WHEN te.attendance THEN te.ticket_id END)       AS total_attended,
    COUNT(DISTINCT e.event_id)                                          AS total_events,
    COUNT(DISTINCT e.dept_name)                                         AS total_depts,

    -- Registration breakdown by event type
    jsonb_object_agg(
      DISTINCT evt.event_type,
      (
        SELECT COUNT(DISTINCT te2.ticket_id)
        FROM public.ticket_event te2
        JOIN public.ticket_payments tp2 ON tp2.ticket_id = te2.ticket_id
        JOIN public.events e2 ON e2.event_id = te2.event_id
        WHERE e2.event_type = evt.event_type
          AND tp2.status IN ('NotVerified', 'Accepted')
      )
    )                                                                   AS regs_by_event_type,

    -- Dept-level summary
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'dept_name', e.dept_name,
        'reg_count', COALESCE(e.reg_count, 0),
        'attend_count', COALESCE(e.attend_count, 0)
      )
    )                                                                   AS dept_summary

  FROM public.events e
  CROSS JOIN (SELECT DISTINCT event_type FROM public.events) AS evt
  LEFT JOIN public.ticket_event te ON te.event_id = e.event_id
  LEFT JOIN public.ticket_payments tp ON tp.ticket_id = te.ticket_id
    AND tp.status IN ('NotVerified', 'Accepted')
`;

async function getCollegeAnalytics(db) {
  const result = await db.query(COLLEGE_ANALYTICS_QUERY);
  return result.rows[0];
}

// ── Dept-level analytics ──────────────────────────────────────────────────────

async function getDeptAnalytics(db, deptName = null) {
  const sql = `
    SELECT
      e.dept_name,
      COUNT(DISTINCT e.event_id)                                        AS event_count,
      COALESCE(SUM(e.reg_count), 0)                                     AS total_registrations,
      COALESCE(SUM(e.attend_count), 0)                                  AS total_attended,
      jsonb_agg(
        jsonb_build_object(
          'event_id',     e.event_id,
          'name',         e.name,
          'event_type',   e.event_type,
          'date',         e.date,
          'reg_count',    COALESCE(e.reg_count, 0),
          'attend_count', COALESCE(e.attend_count, 0)
        )
        ORDER BY e.name
      )                                                                 AS events
    FROM public.events e
    ${deptName ? 'WHERE e.dept_name = $1' : ''}
    GROUP BY e.dept_name
    ORDER BY e.dept_name
  `;
  const result = await db.query(sql, deptName ? [deptName] : []);
  return result.rows;
}

// ── Event list analytics ──────────────────────────────────────────────────────

/**
 * @param {object} db
 * @param {{ deptName?: string, eventId?: string }} filters
 */
async function getEventsAnalytics(db, filters = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (filters.deptName) {
    conditions.push(`e.dept_name = $${idx++}`);
    values.push(filters.deptName);
  }
  if (filters.eventId) {
    conditions.push(`e.event_id = $${idx++}`);
    values.push(filters.eventId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      e.event_id,
      e.name,
      e.dept_name,
      e.event_type,
      e.date,
      COALESCE(e.reg_count, 0)     AS reg_count,
      COALESCE(e.attend_count, 0)  AS attend_count
    FROM public.events e
    ${whereClause}
    ORDER BY e.dept_name, e.name
  `;

  const result = await db.query(sql, values);
  return result.rows;
}

// ── Single event analytics ────────────────────────────────────────────────────

const EVENT_DETAIL_QUERY = `
  WITH regs_by_day AS (
    SELECT
      DATE_TRUNC('day', tp.created_at) AS day,
      COUNT(DISTINCT te.ticket_id)     AS count
    FROM public.ticket_event te
    JOIN public.ticket_payments tp ON tp.ticket_id = te.ticket_id
    WHERE te.event_id = $1
      AND tp.status IN ('NotVerified', 'Accepted')
    GROUP BY 1
    ORDER BY 1
  ),
  status_counts AS (
    SELECT tp.status, COUNT(*) AS count
    FROM public.ticket_event te
    JOIN public.ticket_payments tp ON tp.ticket_id = te.ticket_id
    WHERE te.event_id = $1
    GROUP BY tp.status
  )
  SELECT
    e.event_id,
    e.name,
    e.dept_name,
    e.event_type,
    e.date,
    COALESCE(e.reg_count, 0)     AS reg_count,
    COALESCE(e.attend_count, 0)  AS attend_count,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('day', day, 'count', count)) FROM regs_by_day),
      '[]'::jsonb
    )                            AS registrations_by_day,
    COALESCE(
      (SELECT jsonb_object_agg(status, count) FROM status_counts),
      '{}'::jsonb
    )                            AS registrations_by_status
  FROM public.events e
  WHERE e.event_id = $1
`;

async function getEventAnalyticsById(db, eventId) {
  const result = await db.query(EVENT_DETAIL_QUERY, [eventId]);
  return result.rows[0] || null;
}

module.exports = {
  getCollegeAnalytics,
  getDeptAnalytics,
  getEventsAnalytics,
  getEventAnalyticsById,
};

