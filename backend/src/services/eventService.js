const EVENTS_QUERY = `
  SELECT
    event_id,
    name,
    dept_name,
    event_type,
    date,
    COALESCE(reg_count, 0) AS reg_count,
    COALESCE(attend_count, 0) AS attend_count
  FROM public.events
  ORDER BY name, event_id;
`;

async function listEvents(db) {
  const result = await db.query(EVENTS_QUERY);
  return result.rows;
}

module.exports = { EVENTS_QUERY, listEvents };
