const express = require('express');
const { listEvents } = require('../services/eventService');
const { asyncHandler } = require('../utils/errors');

function createEventsRouter({ db }) {
  const router = express.Router();

  router.get('/events', asyncHandler(async (_req, res) => {
    res.json({ rows: await listEvents(db) });
  }));

  return router;
}

module.exports = { createEventsRouter };
