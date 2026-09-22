'use strict';

const express = require('express');
const { authn } = require('../middleware/authn');
const { authz, assertEventScope, assertDeptScope } = require('../middleware/authz');
const { PERMISSIONS } = require('../config/permissions');
const { asyncHandler, parseUuid, HttpError } = require('../utils/errors');
const {
  getCollegeAnalytics,
  getDeptAnalytics,
  getEventsAnalytics,
  getEventAnalyticsById,
} = require('../services/analyticsService');

function createAnalyticsRouter({ db }) {
  const router = express.Router();

  /**
   * GET /analytics/college
   *
   * College-level aggregate: total registrations, attendance, event-type
   * breakdown, and a per-dept summary.
   * Roles: master_admin, super_admin
   */
  router.get(
    '/analytics/college',
    authn, authz(PERMISSIONS.ANALYTICS_COLLEGE),
    asyncHandler(async (_req, res) => {
      const data = await getCollegeAnalytics(db);
      return res.status(200).json(data);
    }),
  );

  /**
   * GET /analytics/dept
   *
   * Per-dept aggregate. Query param: ?dept=<name> (master/super only).
   * dept_admin is automatically scoped to their own dept.
   * Roles: master_admin, super_admin, dept_admin
   */
  router.get(
    '/analytics/dept',
    authn, authz(PERMISSIONS.ANALYTICS_DEPT),
    asyncHandler(async (req, res) => {
      const user = req.adminUser;

      let deptName = req.query.dept || null;

      if (user.role === 'dept_admin') {
        // Ignore query param — always use the scope from the JWT
        deptName = user.dept_name;
      }

      const data = await getDeptAnalytics(db, deptName);
      return res.status(200).json({ rows: data });
    }),
  );

  /**
   * GET /analytics/events
   *
   * Event list with reg/attend counts. Scoped per role.
   * Query: ?dept=<name> for master/super
   * Roles: master_admin, super_admin, dept_admin, event_admin
   */
  router.get(
    '/analytics/events',
    authn, authz(PERMISSIONS.ANALYTICS_EVENT),
    asyncHandler(async (req, res) => {
      const user = req.adminUser;
      const filters = {};

      if (user.role === 'dept_admin') {
        filters.deptName = user.dept_name;
      } else if (user.role === 'event_admin') {
        filters.eventId = user.event_id;
      } else if (req.query.dept) {
        filters.deptName = req.query.dept;
      }

      const data = await getEventsAnalytics(db, filters);
      return res.status(200).json({ rows: data });
    }),
  );

  /**
   * GET /analytics/events/:eventId
   *
   * Per-event detail: reg/attend, day-by-day registration time series,
   * ticket status breakdown.
   * Roles: master_admin, super_admin, dept_admin (own dept), event_admin (own event)
   */
  router.get(
    '/analytics/events/:eventId',
    authn, authz(PERMISSIONS.ANALYTICS_EVENT),
    asyncHandler(async (req, res) => {
      const eventId = parseUuid(req.params.eventId, 'eventId');
      const user = req.adminUser;

      // Fetch the event first so we can check dept scope
      const data = await getEventAnalyticsById(db, eventId);
      if (!data) {
        throw new HttpError(404, 'event not found', 'EVENT_NOT_FOUND');
      }

      // Scope checks
      assertEventScope(user, eventId);
      if (user.role === 'dept_admin') {
        assertDeptScope(user, data.dept_name);
      }

      return res.status(200).json(data);
    }),
  );

  return router;
}

module.exports = { createAnalyticsRouter };

