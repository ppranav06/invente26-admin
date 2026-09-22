const assert = require('node:assert/strict');
const test = require('node:test');

const { getTicketDetails, searchTicketsByEmail } = require('../src/services/ticketService');
const { markAttendance } = require('../src/services/attendanceService');
const { addTicketEvent, replaceTicketEvent } = require('../src/services/assignmentService');
const { buildFilters, getParticipants } = require('../src/services/participantService');
const { isCompatibleEventType } = require('../src/utils/ticketTypes');
const { parseUuid } = require('../src/utils/errors');

const ticketId = '01a065e6-e1df-7791-9eff-8195a169c15a';
const eventOne = '01a065e6-e1f7-752b-a590-1bfc4f0359a0';
const eventTwo = '01a065e6-e216-7e05-860b-eae57e2f7056';

test('ticket details use one set-based query for all linked events and teams', async () => {
  const calls = [];
  const db = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return {
        rows: [{
          ticket_id: ticketId,
          ticket_type: 'TECHPASS',
          status: 'Accepted',
          amount_paid: '300.00',
          payment_id: 'pay-1',
          created_at: null,
          updated_at: null,
          user_id: null,
          user_email: null,
          user_name: null,
          user_phone: null,
          user_college_name: null,
          user_year_of_study: null,
          events: [
            { position: 1, event_id: eventOne, name: 'Robotics', event_type: 'TECH', attendance: false },
            { position: 2, event_id: eventTwo, name: 'Quiz', event_type: 'TECH', attendance: true },
          ],
          hackathon_teams: [],
        }],
      };
    },
  };

  const response = await getTicketDetails(db, ticketId);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [ticketId]);
  assert.equal(response.events.length, 2);
  assert.equal(response.events[1].attendance, true);
});

test('email ticket lookup returns complete results with one normalized query', async () => {
  const calls = [];
  const db = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return {
        rows: [{
          ticket_id: ticketId,
          ticket_type: 'TECHPASS',
          status: 'Accepted',
          amount_paid: '300.00',
          payment_id: 'pay-1',
          created_at: '2026-09-20T10:00:00.000Z',
          updated_at: null,
          user_id: 'user-1',
          user_email: 'participant@example.com',
          user_name: 'Participant One',
          user_phone: null,
          user_college_name: 'Example College',
          user_year_of_study: 3,
          events: [{
            position: 1,
            event_id: eventOne,
            name: 'Robotics',
            dept_name: 'IT',
            event_type: 'TECH',
            date: null,
            attendance: false,
            attendance_timestamp: null,
          }],
          hackathon_teams: [],
        }],
      };
    },
  };

  const response = await searchTicketsByEmail(db, '  Participant@Example.COM ');

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, ['participant@example.com']);
  assert.match(calls[0].sql, /LIMIT 50/);
  assert.equal(response.rows.length, 1);
  assert.equal(response.rows[0].ticket.user.email, 'participant@example.com');
  assert.equal(response.rows[0].events[0].event_id, eventOne);
});

test('participant filters combine name, email, phone, and college safely', async () => {
  const filters = buildFilters({ search: 'Ada', college: 'Example' }, 2);

  assert.equal(filters.clauses.length, 2);
  assert.match(filters.clauses[0], /college_name ILIKE/);
  assert.match(filters.clauses[1], /u\.name ILIKE/);
  assert.match(filters.clauses[1], /u\.email ILIKE/);
  assert.match(filters.clauses[1], /u\.phone ILIKE/);
  assert.deepEqual(filters.values, ['%Example%', '%Ada%']);

  const calls = [];
  const db = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('COUNT(*)')) return { rows: [{ total: '1' }] };
      return { rows: [{ name: 'Ada', email: 'ada@example.com' }] };
    },
  };

  const result = await getParticipants(db, eventOne, {
    page: 1,
    limit: 50,
    search: 'Ada',
    college: 'Example',
  });

  assert.equal(result.total, 1);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.params.includes('%Example%')));
  assert.ok(calls.every((call) => call.params.includes('%Ada%')));
});

function clientForAttendance(currentRow) {
  const calls = [];
  return {
    calls,
    client: {
      query: async (sql, params) => {
        calls.push({ sql, params });
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
        if (sql.includes('FROM public.ticket_event te') && sql.includes('FOR UPDATE OF te')) return { rows: [currentRow] };
        if (sql.includes('UPDATE public.ticket_event')) {
          return { rows: [{ ticket_id: ticketId, event_id: eventOne, attendance: true, attendance_timestamp: '2026-09-19T10:00:00.000Z', updated_at: '2026-09-19T10:00:00.000Z' }] };
        }
        if (sql.includes('UPDATE public.events')) return { rows: [] };
        throw new Error(`unexpected SQL: ${sql}`);
      },
      release() {},
    },
  };
}

test('attendance marks only the selected event and updates its counter once', async () => {
  const fake = clientForAttendance({
    ticket_id: ticketId,
    event_id: eventOne,
    attendance: false,
    attendance_timestamp: null,
    name: 'Robotics',
    dept_name: 'IT',
    event_type: 'TECH',
    date: null,
    ticket_type: 'TECHPASS',
  });
  const db = { getClient: async () => fake.client };

  const result = await markAttendance(db, ticketId, eventOne);

  assert.equal(result.event.event_id, eventOne);
  assert.equal(result.event.attendance, true);
  assert.equal(fake.calls.filter((call) => call.sql.includes('UPDATE public.events')).length, 1);
});

test('already-attended events are idempotent and do not update counters', async () => {
  const fake = clientForAttendance({
    ticket_id: ticketId,
    event_id: eventOne,
    attendance: true,
    attendance_timestamp: '2026-09-19T10:00:00.000Z',
    name: 'Robotics',
    dept_name: 'IT',
    event_type: 'TECH',
    date: null,
    ticket_type: 'TECHPASS',
  });
  const db = { getClient: async () => fake.client };

  const result = await markAttendance(db, ticketId, eventOne);

  assert.equal(result.already_attended, true);
  assert.equal(fake.calls.some((call) => call.sql.includes('UPDATE public.events')), false);
});

test('event replacement rejects attended rows and duplicate event IDs', async () => {
  const attendedClient = {
    query: async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT ticket_id, ticket_type')) return { rows: [{ ticket_id: ticketId, ticket_type: 'TECHPASS' }] };
      if (sql.includes('SELECT\n          te.event_id')) return { rows: [{ event_id: eventOne, attendance: true, event_type: 'TECH' }] };
      throw new Error(`unexpected SQL: ${sql}`);
    },
    release() {},
  };

  await assert.rejects(
    replaceTicketEvent({ getClient: async () => attendedClient }, ticketId, eventOne, eventTwo),
    (error) => error.code === 'ATTENDED_EVENT_LOCKED',
  );

  const duplicateClient = {
    query: async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT ticket_id, ticket_type')) return { rows: [{ ticket_id: ticketId, ticket_type: 'TECHPASS' }] };
      if (sql.includes('SELECT\n          te.event_id')) return { rows: [
        { event_id: eventOne, attendance: false, event_type: 'TECH' },
        { event_id: eventTwo, attendance: false, event_type: 'TECH' },
      ] };
      throw new Error(`unexpected SQL: ${sql}`);
    },
    release() {},
  };

  await assert.rejects(
    replaceTicketEvent({ getClient: async () => duplicateClient }, ticketId, eventOne, eventTwo),
    (error) => error.code === 'DUPLICATE_TICKET_EVENT',
  );
});

test('event replacement updates one relationship and transfers its registration counter', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT ticket_id, ticket_type')) return { rows: [{ ticket_id: ticketId, ticket_type: 'TECHPASS' }] };
      if (sql.includes('SELECT\n          te.event_id')) return { rows: [{ event_id: eventOne, attendance: false, event_type: 'TECH' }] };
      if (sql.includes('SELECT event_id, name, dept_name, event_type, date')) return { rows: [{ event_id: eventTwo, name: 'Quiz', dept_name: 'IT', event_type: 'TECH', date: null }] };
      if (sql.includes('UPDATE public.ticket_event')) return { rows: [{ ticket_id: ticketId, event_id: eventTwo, attendance: false, attendance_timestamp: null, updated_at: '2026-09-19T10:00:00.000Z' }] };
      if (sql.includes('UPDATE public.events')) return { rows: [] };
      throw new Error(`unexpected SQL: ${sql}`);
    },
    release() {},
  };

  const result = await replaceTicketEvent({ getClient: async () => client }, ticketId, eventOne, eventTwo);

  assert.equal(result.previous_event_id, eventOne);
  assert.equal(result.event.event_id, eventTwo);
  assert.equal(calls.filter((call) => call.sql.includes('UPDATE public.events')).length, 1);
});

function clientForAdd({ ticketType = 'TECHPASS', links = [], event = null, ticketExists = true } = {}) {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT ticket_id, ticket_type')) {
        return { rows: ticketExists ? [{ ticket_id: ticketId, ticket_type: ticketType }] : [] };
      }
      if (sql.includes('FROM public.ticket_event te') && sql.includes('FOR UPDATE') && !sql.includes('JOIN public.events')) {
        return { rows: links };
      }
      if (sql.includes('FROM public.events') && sql.includes('WHERE event_id = $1')) {
        return { rows: event ? [event] : [] };
      }
      if (sql.includes('INSERT INTO public.ticket_event')) {
        return {
          rows: [{
            ticket_id: ticketId,
            event_id: event.event_id,
            attendance: false,
            attendance_timestamp: null,
            created_at: '2026-09-19T10:00:00.000Z',
            updated_at: '2026-09-19T10:00:00.000Z',
          }],
        };
      }
      if (sql.includes('UPDATE public.events')) return { rows: [] };
      if (sql.includes('ROW_NUMBER()')) {
        return {
          rows: [{
            event_id: event.event_id,
            name: event.name,
            dept_name: event.dept_name,
            event_type: event.event_type,
            date: event.date,
            attendance: false,
            attendance_timestamp: null,
            position: links.length + 1,
          }],
        };
      }
      throw new Error(`unexpected SQL: ${sql}`);
    },
    release() {},
  };
  return { client, calls };
}

const eventThree = '01a065e6-e22f-7e05-860b-eae57e2f7056';

test('event addition creates an unattended relationship and increments its counter', async () => {
  const fake = clientForAdd({
    links: [{ event_id: eventOne }, { event_id: eventTwo }],
    event: { event_id: eventThree, name: 'Build Sprint', dept_name: 'IT', event_type: 'TECH', date: null },
  });

  const result = await addTicketEvent({ getClient: async () => fake.client }, ticketId, eventThree);

  assert.equal(result.event.event_id, eventThree);
  assert.equal(result.event.attendance, false);
  assert.equal(result.event.position, 3);
  assert.equal(fake.calls.filter((call) => call.sql.includes('INSERT INTO public.ticket_event')).length, 1);
  assert.equal(fake.calls.filter((call) => call.sql.includes('UPDATE public.events')).length, 1);
  assert.equal(fake.calls.filter((call) => call.sql === 'COMMIT').length, 1);
});

test('event addition rejects unsupported tickets and a full TECHPASS', async () => {
  const missingTicket = clientForAdd({ ticketExists: false });
  await assert.rejects(
    addTicketEvent({ getClient: async () => missingTicket.client }, ticketId, eventThree),
    (error) => error.code === 'TICKET_NOT_FOUND',
  );
  assert.equal(missingTicket.calls.filter((call) => call.sql === 'ROLLBACK').length, 1);

  const wrongType = clientForAdd({
    ticketType: 'NONTECHPASS',
    event: { event_id: eventThree, name: 'Build Sprint', dept_name: 'IT', event_type: 'TECH', date: null },
  });
  await assert.rejects(
    addTicketEvent({ getClient: async () => wrongType.client }, ticketId, eventThree),
    (error) => error.code === 'TECHPASS_REQUIRED',
  );
  assert.equal(wrongType.calls.filter((call) => call.sql === 'ROLLBACK').length, 1);

  const full = clientForAdd({
    links: [
      { event_id: eventOne },
      { event_id: eventTwo },
      { event_id: eventThree },
      { event_id: '01a065e6-e23f-7e05-860b-eae57e2f7056' },
    ],
    event: { event_id: '01a065e6-e24f-7e05-860b-eae57e2f7056', name: 'Extra', dept_name: 'IT', event_type: 'TECH', date: null },
  });
  await assert.rejects(
    addTicketEvent({ getClient: async () => full.client }, ticketId, '01a065e6-e24f-7e05-860b-eae57e2f7056'),
    (error) => error.code === 'TECHPASS_EVENT_LIMIT',
  );
  assert.equal(full.calls.filter((call) => call.sql === 'ROLLBACK').length, 1);
});

test('event addition rejects duplicate, missing, and incompatible events', async () => {
  const duplicate = clientForAdd({
    links: [{ event_id: eventOne }],
    event: { event_id: eventOne, name: 'Robotics', dept_name: 'IT', event_type: 'TECH', date: null },
  });
  await assert.rejects(
    addTicketEvent({ getClient: async () => duplicate.client }, ticketId, eventOne),
    (error) => error.code === 'DUPLICATE_TICKET_EVENT',
  );

  const missing = clientForAdd({ links: [{ event_id: eventOne }] });
  await assert.rejects(
    addTicketEvent({ getClient: async () => missing.client }, ticketId, eventThree),
    (error) => error.code === 'EVENT_NOT_FOUND',
  );

  const incompatible = clientForAdd({
    links: [{ event_id: eventOne }],
    event: { event_id: eventThree, name: 'Workshop', dept_name: 'IT', event_type: 'WORKSHOP', date: null },
  });
  await assert.rejects(
    addTicketEvent({ getClient: async () => incompatible.client }, ticketId, eventThree),
    (error) => error.code === 'INCOMPATIBLE_EVENT_TYPE',
  );

  assert.equal(duplicate.calls.filter((call) => call.sql === 'ROLLBACK').length, 1);
  assert.equal(missing.calls.filter((call) => call.sql === 'ROLLBACK').length, 1);
  assert.equal(incompatible.calls.filter((call) => call.sql === 'ROLLBACK').length, 1);
});

test('type matching and UUID validation support the live schema', () => {
  assert.equal(isCompatibleEventType('TECHPASS', 'TECH'), true);
  assert.equal(isCompatibleEventType('TECHPASS', 'WORKSHOP'), false);
  assert.equal(isCompatibleEventType('HACKATHON', 'RACING', 'RACING'), true);
  assert.equal(parseUuid(ticketId), ticketId);
  assert.throws(() => parseUuid('not-a-uuid', 'ticketId'), /valid UUID/);
});
