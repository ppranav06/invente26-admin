const express = require('express');
const { getTicketDetails } = require('../services/ticketService');
const { markAttendance } = require('../services/attendanceService');
const { replaceTicketEvent } = require('../services/assignmentService');
const { asyncHandler, parseUuid } = require('../utils/errors');

function createScanRouter({ db }) {
  const router = express.Router();

  router.get('/scan/:ticketId', asyncHandler(async (req, res) => {
    const ticketId = parseUuid(req.params.ticketId, 'ticketId');
    res.json(await getTicketDetails(db, ticketId));
  }));

  router.post('/scan/:ticketId/attend', asyncHandler(async (req, res) => {
    const ticketId = parseUuid(req.params.ticketId, 'ticketId');
    const eventId = parseUuid(req.body?.event_id, 'event_id');
    res.json(await markAttendance(db, ticketId, eventId));
  }));

  router.post('/scan/:ticketId/assign', asyncHandler(async (req, res) => {
    const ticketId = parseUuid(req.params.ticketId, 'ticketId');
    const currentEventId = parseUuid(req.body?.current_event_id, 'current_event_id');
    const nextEventId = parseUuid(req.body?.event_id, 'event_id');
    res.json(await replaceTicketEvent(db, ticketId, currentEventId, nextEventId));
  }));

  return router;
}

module.exports = { createScanRouter };
