const { HttpError } = require('../utils/errors');

async function markAttendance(db, ticketId, eventId) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
        SELECT
          te.ticket_id,
          te.event_id,
          COALESCE(te.attendance, false) AS attendance,
          te.attendance_timestamp,
          e.name,
          e.dept_name,
          e.event_type,
          e.date,
          tp.ticket_type
        FROM public.ticket_event te
        JOIN public.ticket_payments tp ON tp.ticket_id = te.ticket_id
        JOIN public.events e ON e.event_id = te.event_id
        WHERE te.ticket_id = $1 AND te.event_id = $2
        FOR UPDATE OF te
      `,
      [ticketId, eventId],
    );

    const current = currentResult.rows[0];
    if (!current) {
      throw new HttpError(404, 'event is not associated with this ticket', 'TICKET_EVENT_NOT_FOUND');
    }

    if (current.attendance) {
      await client.query('COMMIT');
      return { already_attended: true, event: current };
    }

    const updateResult = await client.query(
      `
        UPDATE public.ticket_event
        SET attendance = true,
            attendance_timestamp = COALESCE(attendance_timestamp, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        WHERE ticket_id = $1 AND event_id = $2 AND COALESCE(attendance, false) = false
        RETURNING ticket_id, event_id, attendance, attendance_timestamp, updated_at
      `,
      [ticketId, eventId],
    );

    if (!updateResult.rows[0]) {
      throw new HttpError(409, 'attendance changed before this request completed', 'ATTENDANCE_CONFLICT');
    }

    await client.query(
      `
        UPDATE public.events
        SET attend_count = COALESCE(attend_count, 0) + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE event_id = $1
      `,
      [eventId],
    );

    await client.query('COMMIT');

    return {
      already_attended: false,
      event: {
        ...current,
        ...updateResult.rows[0],
        attendance: true,
      },
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Preserve the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { markAttendance };
