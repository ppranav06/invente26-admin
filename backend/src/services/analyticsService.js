'use strict';

// ── College-level analytics ───────────────────────────────────────────────────

const COLLEGE_ANALYTICS_QUERY = `
  WITH verified_registrations AS (
      -- Single pass to join and filter verified tickets
      SELECT 
          te.ticket_id,
          te.event_id,
          te.attendance,
          e.dept_name,
          e.event_type
      FROM public.events e
      JOIN public.ticket_event te 
        ON te.event_id = e.event_id
      JOIN public.ticket_payments tp 
        ON tp.ticket_id = te.ticket_id
      WHERE tp.status = 'Accepted'
  ),
  dept_aggregates AS (
      -- Computes reg_count and attend_count per department
      SELECT 
          e.dept_name,
          COUNT(DISTINCT vr.ticket_id)                                  AS reg_count,
          COUNT(DISTINCT CASE WHEN vr.attendance THEN vr.ticket_id END) AS attend_count
      FROM (SELECT DISTINCT dept_name FROM public.events) e
      LEFT JOIN verified_registrations vr 
        ON vr.dept_name = e.dept_name
      GROUP BY e.dept_name
  ),
  event_type_aggregates AS (
      -- Computes reg_count per event_type
      SELECT 
          e.event_type,
          COUNT(DISTINCT vr.ticket_id) AS reg_count
      FROM (SELECT DISTINCT event_type FROM public.events) e
      LEFT JOIN verified_registrations vr 
        ON vr.event_type = e.event_type
      GROUP BY e.event_type
  )
  SELECT 
      COALESCE(COUNT(DISTINCT vr.ticket_id), 0)                                 AS total_registrations,
      COALESCE(COUNT(DISTINCT CASE WHEN vr.attendance THEN vr.ticket_id END), 0) AS total_attended,
      (SELECT COUNT(*) FROM public.events)                                       AS total_events,
      (SELECT COUNT(DISTINCT dept_name) FROM public.events)                      AS total_depts,
      (SELECT COALESCE(jsonb_object_agg(event_type, reg_count), '{}'::jsonb) 
      FROM event_type_aggregates)                                               AS regs_by_event_type,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'dept_name', dept_name,
          'reg_count', reg_count,
          'attend_count', attend_count
      )), '[]'::jsonb) 
      FROM dept_aggregates)                                                     AS dept_summary
  FROM verified_registrations vr
`;

async function getCollegeAnalytics(db) {
  const result = await db.query(COLLEGE_ANALYTICS_QUERY);
  return result.rows[0];
}

// ── Dept-level analytics ──────────────────────────────────────────────────────

async function getDeptAnalytics(db, deptName = null) {
  const sql = `
    WITH event_stats AS (
        -- Aggregate registrations and attendance per individual event
        SELECT 
            e.event_id,
            e.name,
            e.dept_name,
            e.event_type,
            e.date,
            COUNT(DISTINCT CASE WHEN tp.status = 'Accepted' THEN te.ticket_id END) AS reg_count,
            COUNT(DISTINCT CASE WHEN tp.status = 'Accepted' AND te.attendance THEN te.ticket_id END) AS attend_count
        FROM public.events e
        LEFT JOIN public.ticket_event te ON te.event_id = e.event_id
        LEFT JOIN public.ticket_payments tp ON tp.ticket_id = te.ticket_id
        ${deptName ? 'WHERE e.dept_name = $1' : ''}
        GROUP BY e.event_id, e.name, e.dept_name, e.event_type, e.date
    )
    SELECT
        es.dept_name,
        COUNT(DISTINCT es.event_id)         AS event_count,
        COALESCE(SUM(es.reg_count), 0)      AS total_registrations,
        COALESCE(SUM(es.attend_count), 0)   AS total_attended,
        jsonb_agg(
            jsonb_build_object(
                'event_id',     es.event_id,
                'name',         es.name,
                'event_type',   es.event_type,
                'date',         es.date,
                'reg_count',    es.reg_count,
                'attend_count', es.attend_count
            )
            ORDER BY es.name
        ) AS events
    FROM event_stats es
    GROUP BY es.dept_name
    ORDER BY es.dept_name
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
      COUNT(DISTINCT CASE WHEN tp.status = 'Accepted' THEN te.ticket_id END) AS reg_count,
      COUNT(DISTINCT CASE WHEN tp.status = 'Accepted' AND te.attendance THEN te.ticket_id END) AS attend_count
    FROM public.events e
    LEFT JOIN public.ticket_event te 
      ON te.event_id = e.event_id
    LEFT JOIN public.ticket_payments tp 
      ON tp.ticket_id = te.ticket_id
    ${whereClause}
    GROUP BY 
      e.event_id, 
      e.name, 
      e.dept_name, 
      e.event_type, 
      e.date
    ORDER BY e.dept_name, e.name
  `;

  const result = await db.query(sql, values);
  return result.rows;
}

// ── Single event analytics ────────────────────────────────────────────────────

const EVENT_DETAIL_QUERY = `
  WITH event_tickets AS (
      -- Fetch all tickets linked to this event along with payment status
      SELECT 
          te.ticket_id,
          te.attendance,
          tp.status,
          DATE_TRUNC('day', tp.created_at) AS pay_day
      FROM public.ticket_event te
      JOIN public.ticket_payments tp ON tp.ticket_id = te.ticket_id
      WHERE te.event_id = $1
  ),
  regs_by_day AS (
      -- Daily count of accepted registrations
      SELECT 
          TO_CHAR(pay_day, 'YYYY-MM-DD') AS day,
          COUNT(DISTINCT ticket_id)     AS count
      FROM event_tickets
      WHERE status = 'Accepted'
      GROUP BY pay_day
      ORDER BY pay_day
  ),
  status_counts AS (
      -- Breakdown across all payment statuses (Accepted, Pending, Rejected, etc.)
      SELECT 
          status, 
          COUNT(DISTINCT ticket_id) AS count
      FROM event_tickets
      GROUP BY status
  )
  SELECT
      e.event_id,
      e.name,
      e.dept_name,
      e.event_type,
      e.date,
      COALESCE(COUNT(DISTINCT CASE WHEN et.status = 'Accepted' THEN et.ticket_id END), 0) AS reg_count,
      COALESCE(COUNT(DISTINCT CASE WHEN et.status = 'Accepted' AND et.attendance THEN et.ticket_id END), 0) AS attend_count,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('day', day, 'count', count)) FROM regs_by_day),
        '[]'::jsonb
      ) AS registrations_by_day,
      COALESCE(
        (SELECT jsonb_object_agg(status, count) FROM status_counts),
        '{}'::jsonb
      ) AS registrations_by_status
  FROM public.events e
  LEFT JOIN event_tickets et ON true
  WHERE e.event_id = $1
  GROUP BY e.event_id, e.name, e.dept_name, e.event_type, e.date
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

