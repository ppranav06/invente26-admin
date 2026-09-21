'use strict';

const { HttpError } = require('../utils/errors');

/**
 * Authorization middleware factory.
 *
 * @param {string[]} allowedRoles - Roles allowed to access the route.
 *   Use the PERMISSIONS constants from src/config/permissions.js.
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   const { PERMISSIONS } = require('../config/permissions');
 *   router.get('/scan/:id', authn, authz(PERMISSIONS.SCAN_READ), handler);
 */
function authz(allowedRoles) {
  return (req, res, next) => {
    if (!req.adminUser) {
      return next(new HttpError(401, 'unauthenticated', 'UNAUTHENTICATED'));
    }
    if (!allowedRoles.includes(req.adminUser.role)) {
      return next(new HttpError(403, 'insufficient permissions', 'FORBIDDEN'));
    }
    next();
  };
}

/**
 * Assert that an event_admin is acting within their assigned event.
 * master_admin passes through unconditionally.
 *
 * Call this inside route handlers where scope matters.
 *
 * @param {{ role: string, eventId: string|null }} adminUser - from req.adminUser
 * @param {string} eventId - the event being accessed
 * @throws {HttpError} 403 if out of scope
 */
function assertEventScope(adminUser, eventId) {
  if (adminUser.role === 'event_admin' && adminUser.eventId !== eventId) {
    throw new HttpError(403, 'you do not have access to this event', 'EVENT_SCOPE_VIOLATION');
  }
}

/**
 * Assert that a dept_admin is acting within their assigned department.
 * master_admin and super_admin pass through unconditionally.
 *
 * @param {{ role: string, deptName: string|null }} adminUser - from req.adminUser
 * @param {string} deptName - the dept being accessed
 * @throws {HttpError} 403 if out of scope
 */
function assertDeptScope(adminUser, deptName) {
  if (adminUser.role === 'dept_admin' && adminUser.deptName !== deptName) {
    throw new HttpError(403, 'you do not have access to this department', 'DEPT_SCOPE_VIOLATION');
  }
}

module.exports = { authz, assertEventScope, assertDeptScope };

