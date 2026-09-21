'use strict';

const express = require('express');
const logger = require('../utils/logger');
const { getTicketDetails } = require('../services/ticketService');
const { markAttendance } = require('../services/attendanceService');
const { replaceTicketEvent } = require('../services/assignmentService');
const { asyncHandler, parseUuid } = require('../utils/errors');
const { authn } = require('../middleware/authn');
const { authz, assertEventScope } = require('../middleware/authz');
const { PERMISSIONS } = require('../config/permissions');

function createScanRouter({ db }) {
  const router = express.Router();

  /**
   * GET /scan/:ticketId
   * All authenticated roles may look up a ticket.
   */
  router.get(
    '/scan/:ticketId',
    authn, authz(PERMISSIONS.SCAN_READ),
    asyncHandler(async (req, res) => {
      const ticketId = parseUuid(req.params.ticketId, 'ticketId');
      res.json(await getTicketDetails(db, ticketId));
    }),
  );

  /**
   * POST /scan/:ticketId/attend
   * Body: { event_id }
   *
   * Master admin may attend any event.
   * Event admin may only attend their own scoped event (assertEventScope).
   */
  router.post(
    '/scan/:ticketId/attend',
    authn, authz(PERMISSIONS.ATTEND_WRITE),
    asyncHandler(async (req, res) => {
      const ticketId = parseUuid(req.params.ticketId, 'ticketId');
      const eventId  = parseUuid(req.body?.event_id, 'event_id');

      // Scope guard: event_admin can only mark attendance for their own event
      assertEventScope(req.adminUser, eventId);

      const result = await markAttendance(db, ticketId, eventId);
      logger.info({ type: 'attendance_marked', ticket_id: ticketId, event_id: eventId, already_attended: result.already_attended, user_id: req.adminUser?.userId }, 'Attendance marked');
      res.json(result);
    }),
  );

  /**
   * POST /scan/:ticketId/assign
   * Body: { current_event_id, event_id }
   *
   * Master admin: unrestricted.
   * Volunteer: assignment service already blocks attended events.
   */
  router.post(
    '/scan/:ticketId/assign',
    authn, authz(PERMISSIONS.ASSIGN_WRITE),
    asyncHandler(async (req, res) => {
      const ticketId      = parseUuid(req.params.ticketId, 'ticketId');
      const currentEventId = parseUuid(req.body?.current_event_id, 'current_event_id');
      const nextEventId    = parseUuid(req.body?.event_id, 'event_id');
      const result = await replaceTicketEvent(db, ticketId, currentEventId, nextEventId);
      logger.info({ type: 'event_assigned', ticket_id: ticketId, from_event_id: currentEventId, to_event_id: nextEventId, user_id: req.adminUser?.userId }, 'Ticket event reassigned');
      res.json(result);
    }),
  );

  return router;
}

module.exports = { createScanRouter };
