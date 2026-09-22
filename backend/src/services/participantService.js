'use strict';

// ── Paginated participant list ─────────────────────────────────────────────────

const PARTICIPANT_BASE_SELECT = `
  SELECT
    u.name,
    u.email,
    u.phone,
    u.college_name,
    u.year_of_study,
    u.gender,
    tp.ticket_id,
    tp.ticket_type,
    tp.status          AS payment_status,
    tp.created_at      AS registered_at,
    te.attendance,
    te.attendance_timestamp
  FROM public.ticket_event te
  JOIN public.ticket_payments tp ON tp.ticket_id = te.ticket_id
  JOIN public.users u ON u.user_id = tp.user_id
  WHERE te.event_id = $1
`;

/**
 * Build WHERE clause additions + parameter list from optional filter args.
 *
 * @param {{ status?: string, college?: string }} filters
 * @param {number} startIdx - next $N index
 */
function buildFilters(filters, startIdx) {
  const clauses = [];
  const values = [];
  let idx = startIdx;

  if (filters.status) {
    clauses.push(`tp.status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters.college) {
    clauses.push(`u.college_name ILIKE $${idx++}`);
    values.push(`%${filters.college}%`);
  }
  if (filters.search) {
    clauses.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx})`);
    values.push(`%${filters.search}%`);
    idx++;
  }

  return { clauses, values };
}

/**
 * Get a paginated participant list for an event.
 *
 * @param {object} db
 * @param {string} eventId
 * @param {{ page?: number, limit?: number, status?: string, college?: string }} options
 */
async function getParticipants(db, eventId, options = {}) {
  const page  = Math.max(1, Number(options.page)  || 1);
  const limit = Math.min(200, Math.max(1, Number(options.limit) || 50));
  const offset = (page - 1) * limit;

  const { clauses, values } = buildFilters(options, 2); // $1 = eventId

  const whereExtra = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';

  const [rowsResult, countResult] = await Promise.all([
    db.query(
      `${PARTICIPANT_BASE_SELECT}${whereExtra}
       ORDER BY tp.created_at ASC
       LIMIT $${values.length + 2} OFFSET $${values.length + 3}`,
      [eventId, ...values, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*) AS total
       FROM public.ticket_event te
       JOIN public.ticket_payments tp ON tp.ticket_id = te.ticket_id
       JOIN public.users u ON u.user_id = tp.user_id
       WHERE te.event_id = $1${whereExtra}`,
      [eventId, ...values],
    ),
  ]);

  return {
    page,
    limit,
    total: Number(countResult.rows[0].total),
    rows: rowsResult.rows,
  };
}

/**
 * Get all participants for an event (for Excel export).
 * No pagination — returns every matching row.
 *
 * @param {object} db
 * @param {string} eventId
 * @param {{ status?: string, college?: string }} filters
 */
async function getAllParticipants(db, eventId, filters = {}) {
  const { clauses, values } = buildFilters(filters, 2);
  const whereExtra = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';

  const result = await db.query(
    `${PARTICIPANT_BASE_SELECT}${whereExtra} ORDER BY tp.created_at ASC`,
    [eventId, ...values],
  );
  return result.rows;
}

module.exports = { getParticipants, getAllParticipants };

