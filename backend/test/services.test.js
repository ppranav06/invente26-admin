const assert = require('node:assert/strict');
const test = require('node:test');

const { getTicketDetails } = require('../src/services/ticketService');
const { markAttendance } = require('../src/services/attendanceService');
const { replaceTicketEvent } = require('../src/services/assignmentService');
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

test('type matching and UUID validation support the live schema', () => {
  assert.equal(isCompatibleEventType('TECHPASS', 'TECH'), true);
  assert.equal(isCompatibleEventType('TECHPASS', 'WORKSHOP'), false);
  assert.equal(isCompatibleEventType('HACKATHON', 'RACING', 'RACING'), true);
  assert.equal(parseUuid(ticketId), ticketId);
  assert.throws(() => parseUuid('not-a-uuid', 'ticketId'), /valid UUID/);
});
