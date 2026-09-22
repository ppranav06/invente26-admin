const { HttpError } = require('../utils/errors');
const { ticketTypeInfo } = require('../utils/ticketTypes');

const TICKET_DETAILS_QUERY = `
  WITH ticket AS (
    SELECT
      tp.ticket_id,
      tp.ticket_type,
      tp.status,
      tp.amount_paid,
      tp.payment_id,
      tp.created_at,
      tp.updated_at,
      u.user_id,
      u.email AS user_email,
      u.name AS user_name,
      u.phone AS user_phone,
      u.college_name AS user_college_name,
      u.year_of_study AS user_year_of_study
    FROM public.ticket_payments tp
    LEFT JOIN public.users u ON u.user_id = tp.user_id
    WHERE tp.ticket_id = $1
  ),
  ranked_events AS (
    SELECT
      te.ticket_id,
      te.event_id,
      e.name,
      e.dept_name,
      e.event_type,
      e.date,
      COALESCE(te.attendance, false) AS attendance,
      te.attendance_timestamp,
      te.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY te.ticket_id
        ORDER BY te.created_at NULLS LAST, e.name, te.event_id
      ) AS position
    FROM public.ticket_event te
    JOIN public.events e ON e.event_id = te.event_id
    WHERE te.ticket_id = $1
  ),
  linked_events AS (
    SELECT
      ticket_id,
      jsonb_agg(
        jsonb_build_object(
          'position', position,
          'event_id', event_id,
          'name', name,
          'dept_name', dept_name,
          'event_type', event_type,
          'date', date,
          'attendance', attendance,
          'attendance_timestamp', attendance_timestamp
        )
        ORDER BY position
      ) AS events
    FROM ranked_events
    GROUP BY ticket_id
  ),
  members_by_team AS (
    SELECT
      hm.team_id,
      jsonb_agg(
        jsonb_build_object(
          'member_id', hm.member_id,
          'name', hm.name,
          'email', hm.email,
          'phone', hm.phno,
          'is_lead', hm.is_lead,
          'year_of_study', hm.year_of_study
        )
        ORDER BY hm.is_lead DESC, hm.name, hm.member_id
      ) AS members
    FROM public.hackathon_members hm
    JOIN public.hackathon_regs hr ON hr.team_id = hm.team_id
    WHERE hr.ticket_id = $1
    GROUP BY hm.team_id
  ),
  hackathon_teams AS (
    SELECT
      hr.ticket_id,
      jsonb_agg(
        jsonb_build_object(
          'team_id', hr.team_id,
          'team_name', hr.team_name,
          'domain', hr.domain,
          'track', hr.track,
          'members', COALESCE(mbt.members, '[]'::jsonb)
        )
        ORDER BY hr.team_id
      ) AS teams
    FROM public.hackathon_regs hr
    LEFT JOIN members_by_team mbt ON mbt.team_id = hr.team_id
    WHERE hr.ticket_id = $1
    GROUP BY hr.ticket_id
  )
  SELECT
    ticket.*,
    COALESCE(linked_events.events, '[]'::jsonb) AS events,
    COALESCE(hackathon_teams.teams, '[]'::jsonb) AS hackathon_teams
  FROM ticket
  LEFT JOIN linked_events ON linked_events.ticket_id = ticket.ticket_id
  LEFT JOIN hackathon_teams ON hackathon_teams.ticket_id = ticket.ticket_id;
`;

const TICKET_EMAIL_SEARCH_QUERY = `
  WITH matched_tickets AS (
    SELECT latest_ticket.*
    FROM (
      SELECT DISTINCT ON (tp.ticket_id)
        tp.ticket_id,
        tp.ticket_type,
        tp.status,
        tp.amount_paid,
        tp.payment_id,
        tp.created_at,
        tp.updated_at,
        u.user_id,
        u.email AS user_email,
        u.name AS user_name,
        u.phone AS user_phone,
        u.college_name AS user_college_name,
        u.year_of_study AS user_year_of_study
      FROM public.ticket_payments tp
      JOIN public.users u ON u.user_id = tp.user_id
      WHERE LOWER(u.email) = $1
      ORDER BY tp.ticket_id, tp.updated_at DESC NULLS LAST, tp.created_at DESC NULLS LAST
    ) latest_ticket
    ORDER BY latest_ticket.created_at DESC NULLS LAST, latest_ticket.ticket_id
    LIMIT 50
  ),
  ranked_events AS (
    SELECT
      te.ticket_id,
      te.event_id,
      e.name,
      e.dept_name,
      e.event_type,
      e.date,
      COALESCE(te.attendance, false) AS attendance,
      te.attendance_timestamp,
      te.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY te.ticket_id
        ORDER BY te.created_at NULLS LAST, e.name, te.event_id
      ) AS position
    FROM public.ticket_event te
    JOIN public.events e ON e.event_id = te.event_id
    JOIN matched_tickets mt ON mt.ticket_id = te.ticket_id
  ),
  linked_events AS (
    SELECT
      ticket_id,
      jsonb_agg(
        jsonb_build_object(
          'position', position,
          'event_id', event_id,
          'name', name,
          'dept_name', dept_name,
          'event_type', event_type,
          'date', date,
          'attendance', attendance,
          'attendance_timestamp', attendance_timestamp
        )
        ORDER BY position
      ) AS events
    FROM ranked_events
    GROUP BY ticket_id
  ),
  members_by_team AS (
    SELECT
      hr.ticket_id,
      hm.team_id,
      jsonb_agg(
        jsonb_build_object(
          'member_id', hm.member_id,
          'name', hm.name,
          'email', hm.email,
          'phone', hm.phno,
          'is_lead', hm.is_lead,
          'year_of_study', hm.year_of_study
        )
        ORDER BY hm.is_lead DESC, hm.name, hm.member_id
      ) AS members
    FROM public.hackathon_members hm
    JOIN public.hackathon_regs hr ON hr.team_id = hm.team_id
    JOIN matched_tickets mt ON mt.ticket_id = hr.ticket_id
    GROUP BY hr.ticket_id, hm.team_id
  ),
  hackathon_teams AS (
    SELECT
      hr.ticket_id,
      jsonb_agg(
        jsonb_build_object(
          'team_id', hr.team_id,
          'team_name', hr.team_name,
          'domain', hr.domain,
          'track', hr.track,
          'members', COALESCE(mbt.members, '[]'::jsonb)
        )
        ORDER BY hr.team_id
      ) AS teams
    FROM public.hackathon_regs hr
    JOIN matched_tickets mt ON mt.ticket_id = hr.ticket_id
    LEFT JOIN members_by_team mbt
      ON mbt.ticket_id = hr.ticket_id
      AND mbt.team_id = hr.team_id
    GROUP BY hr.ticket_id
  )
  SELECT
    mt.*,
    COALESCE(linked_events.events, '[]'::jsonb) AS events,
    COALESCE(hackathon_teams.teams, '[]'::jsonb) AS hackathon_teams
  FROM matched_tickets mt
  LEFT JOIN linked_events ON linked_events.ticket_id = mt.ticket_id
  LEFT JOIN hackathon_teams ON hackathon_teams.ticket_id = mt.ticket_id
  ORDER BY mt.created_at DESC NULLS LAST, mt.ticket_id;
`;

function formatTicketRow(row) {
  const firstEventType = row.events[0]?.event_type || null;
  const typeInfo = ticketTypeInfo(row.ticket_type, firstEventType);

  return {
    ticket: {
      ticket_id: row.ticket_id,
      ticket_type: row.ticket_type,
      pass_type: typeInfo.passType,
      status: row.status,
      amount_paid: row.amount_paid,
      payment_id: row.payment_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: row.user_id
        ? {
            user_id: row.user_id,
            email: row.user_email,
            name: row.user_name,
            phone: row.user_phone,
            college_name: row.user_college_name,
            year_of_study: row.user_year_of_study,
          }
        : null,
    },
    events: row.events,
    hackathon_teams: row.hackathon_teams,
  };
}

async function getTicketDetails(db, ticketId) {
  const result = await db.query(TICKET_DETAILS_QUERY, [ticketId]);
  const row = result.rows[0];

  if (!row) {
    throw new HttpError(404, 'ticket not found', 'TICKET_NOT_FOUND');
  }

  return formatTicketRow(row);
}

async function searchTicketsByEmail(db, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const result = await db.query(TICKET_EMAIL_SEARCH_QUERY, [normalizedEmail]);
  return { rows: result.rows.map(formatTicketRow) };
}

module.exports = {
  TICKET_DETAILS_QUERY,
  TICKET_EMAIL_SEARCH_QUERY,
  getTicketDetails,
  searchTicketsByEmail,
};
