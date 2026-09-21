'use strict';

const express = require('express');
const { listEvents } = require('../services/eventService');
const { asyncHandler } = require('../utils/errors');
const { authn } = require('../middleware/authn');
const { authz } = require('../middleware/authz');
const { PERMISSIONS } = require('../config/permissions');

function createEventsRouter({ db }) {
  const router = express.Router();

  /**
   * GET /events
   *
   * Returns all events with reg_count and attend_count.
   * All authenticated roles may call this; role-based filtering is handled
   * client-side (the full list is small and safe to expose to any logged-in user).
   */
  router.get(
    '/events',
    authn, authz(PERMISSIONS.EVENTS_READ),
    asyncHandler(async (_req, res) => {
      res.json({ rows: await listEvents(db) });
    }),
  );

  return router;
}

module.exports = { createEventsRouter };
