const { HttpError } = require('../utils/errors');
const { isCompatibleEventType } = require('../utils/ticketTypes');

async function replaceTicketEvent(db, ticketId, currentEventId, nextEventId) {
  if (currentEventId === nextEventId) {
    throw new HttpError(400, 'select a different event', 'SAME_EVENT');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const ticketResult = await client.query(
      'SELECT ticket_id, ticket_type FROM public.ticket_payments WHERE ticket_id = $1 FOR UPDATE',
      [ticketId],
    );
    const ticket = ticketResult.rows[0];
    if (!ticket) {
      throw new HttpError(404, 'ticket not found', 'TICKET_NOT_FOUND');
    }

    const linksResult = await client.query(
      `
        SELECT
          te.event_id,
          COALESCE(te.attendance, false) AS attendance,
          e.name,
          e.dept_name,
          e.event_type,
          e.date
        FROM public.ticket_event te
        JOIN public.events e ON e.event_id = te.event_id
        WHERE te.ticket_id = $1
        FOR UPDATE OF te
      `,
      [ticketId],
    );

    const current = linksResult.rows.find((row) => row.event_id === currentEventId);
    if (!current) {
      throw new HttpError(404, 'current event is not associated with this ticket', 'TICKET_EVENT_NOT_FOUND');
    }
    if (current.attendance) {
      throw new HttpError(409, 'attended events cannot be replaced', 'ATTENDED_EVENT_LOCKED');
    }
    if (linksResult.rows.some((row) => row.event_id === nextEventId)) {
      throw new HttpError(409, 'event is already associated with this ticket', 'DUPLICATE_TICKET_EVENT');
    }

    const affectedEventsResult = await client.query(
      `
        SELECT event_id, name, dept_name, event_type, date
        FROM public.events
        WHERE event_id IN ($1, $2)
        ORDER BY event_id
        FOR UPDATE
      `,
      [currentEventId, nextEventId],
    );
    const nextEvent = affectedEventsResult.rows.find((row) => row.event_id === nextEventId);
    if (!nextEvent) {
      throw new HttpError(404, 'replacement event not found', 'EVENT_NOT_FOUND');
    }

    if (!isCompatibleEventType(ticket.ticket_type, nextEvent.event_type, current.event_type)) {
      throw new HttpError(400, 'replacement event type is not compatible with this ticket', 'INCOMPATIBLE_EVENT_TYPE');
    }

    const updateResult = await client.query(
      `
        UPDATE public.ticket_event
        SET event_id = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE ticket_id = $1 AND event_id = $2 AND COALESCE(attendance, false) = false
        RETURNING ticket_id, event_id, attendance, attendance_timestamp, updated_at
      `,
      [ticketId, currentEventId, nextEventId],
    );

    if (!updateResult.rows[0]) {
      throw new HttpError(409, 'event assignment changed before this request completed', 'ASSIGNMENT_CONFLICT');
    }

    await client.query(
      `
        UPDATE public.events
        SET reg_count = CASE
          WHEN event_id = $1 THEN GREATEST(COALESCE(reg_count, 0) - 1, 0)
          WHEN event_id = $2 THEN COALESCE(reg_count, 0) + 1
          ELSE reg_count
        END,
        updated_at = CURRENT_TIMESTAMP
        WHERE event_id IN ($1, $2)
      `,
      [currentEventId, nextEventId],
    );

    await client.query('COMMIT');

    return {
      previous_event_id: currentEventId,
      event: {
        ...nextEvent,
        ...updateResult.rows[0],
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

async function addTicketEvent(db, ticketId, eventId) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Lock the ticket row before counting links so concurrent additions to the
    // same TECHPASS cannot both observe an available fourth slot.
    const ticketResult = await client.query(
      'SELECT ticket_id, ticket_type FROM public.ticket_payments WHERE ticket_id = $1 FOR UPDATE',
      [ticketId],
    );
    const ticket = ticketResult.rows[0];
    if (!ticket) {
      throw new HttpError(404, 'ticket not found', 'TICKET_NOT_FOUND');
    }
    if (String(ticket.ticket_type || '').toUpperCase() !== 'TECHPASS') {
      throw new HttpError(400, 'only TECHPASS tickets can receive additional events', 'TECHPASS_REQUIRED');
    }

    const linksResult = await client.query(
      `
        SELECT
          te.event_id,
          te.created_at
        FROM public.ticket_event te
        WHERE te.ticket_id = $1
        FOR UPDATE
      `,
      [ticketId],
    );

    if (linksResult.rows.length >= 4) {
      throw new HttpError(409, 'TECHPASS tickets can have at most four events', 'TECHPASS_EVENT_LIMIT');
    }
    if (linksResult.rows.some((row) => row.event_id === eventId)) {
      throw new HttpError(409, 'event is already associated with this ticket', 'DUPLICATE_TICKET_EVENT');
    }

    const eventResult = await client.query(
      `
        SELECT event_id, name, dept_name, event_type, date
        FROM public.events
        WHERE event_id = $1
        FOR UPDATE
      `,
      [eventId],
    );
    const event = eventResult.rows[0];
    if (!event) {
      throw new HttpError(404, 'event not found', 'EVENT_NOT_FOUND');
    }
    if (!isCompatibleEventType(ticket.ticket_type, event.event_type)) {
      throw new HttpError(400, 'additional event type is not compatible with this ticket', 'INCOMPATIBLE_EVENT_TYPE');
    }

    const insertResult = await client.query(
      `
        INSERT INTO public.ticket_event (ticket_id, event_id, attendance, attendance_timestamp)
        VALUES ($1, $2, false, NULL)
        RETURNING ticket_id, event_id, attendance, attendance_timestamp, created_at, updated_at
      `,
      [ticketId, eventId],
    );
    if (!insertResult.rows[0]) {
      throw new HttpError(409, 'event assignment could not be created', 'ASSIGNMENT_CONFLICT');
    }

    await client.query(
      `
        UPDATE public.events
        SET reg_count = COALESCE(reg_count, 0) + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE event_id = $1
      `,
      [eventId],
    );

    const rankedEventResult = await client.query(
      `
        SELECT event_id, name, dept_name, event_type, date, attendance,
               attendance_timestamp, position
        FROM (
          SELECT
            te.event_id,
            e.name,
            e.dept_name,
            e.event_type,
            e.date,
            COALESCE(te.attendance, false) AS attendance,
            te.attendance_timestamp,
            ROW_NUMBER() OVER (
              ORDER BY te.created_at NULLS LAST, e.name, te.event_id
            )::integer AS position
          FROM public.ticket_event te
          JOIN public.events e ON e.event_id = te.event_id
          WHERE te.ticket_id = $1
        ) ranked_events
        WHERE event_id = $2
      `,
      [ticketId, eventId],
    );
    const addedEvent = rankedEventResult.rows[0];
    if (!addedEvent) {
      throw new HttpError(409, 'event assignment could not be loaded after creation', 'ASSIGNMENT_CONFLICT');
    }

    await client.query('COMMIT');

    return { event: addedEvent };
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

module.exports = { addTicketEvent, replaceTicketEvent };
