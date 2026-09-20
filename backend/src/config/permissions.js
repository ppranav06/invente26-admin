'use strict';

/**
 * ROLE & PERMISSION DEFINITIONS
 *
 * This is the single source of truth for all role-based access control in
 * the Invente26 admin system. Edit this file to change who can do what.
 *
 * Permission keys are referenced by middleware and route handlers.
 */

const ROLES = Object.freeze({
  MASTER_ADMIN: 'master_admin',
  SUPER_ADMIN:  'super_admin',
  DEPT_ADMIN:   'dept_admin',
  EVENT_ADMIN:  'event_admin',
  VOLUNTEER:    'volunteer',
});

const PERMISSIONS = Object.freeze({
  // ── Ticket scanning & lookup ──────────────────────────────────────────────
  SCAN_READ: [
    ROLES.MASTER_ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.DEPT_ADMIN,
    ROLES.EVENT_ADMIN,
    ROLES.VOLUNTEER,
  ],

  // ── Attendance marking ────────────────────────────────────────────────────
  // Event admins are additionally scope-checked against their event_id.
  ATTEND_WRITE: [
    ROLES.MASTER_ADMIN,
    ROLES.EVENT_ADMIN,
  ],

  // ── Ticket-event reassignment ─────────────────────────────────────────────
  // Volunteers may only reassign non-attended events (enforced in service).
  ASSIGN_WRITE: [
    ROLES.MASTER_ADMIN,
    ROLES.VOLUNTEER,
  ],

  // ── Events list ───────────────────────────────────────────────────────────
  EVENTS_READ: [
    ROLES.MASTER_ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.DEPT_ADMIN,
    ROLES.EVENT_ADMIN,
    ROLES.VOLUNTEER,
  ],

  // ── Analytics ─────────────────────────────────────────────────────────────
  ANALYTICS_COLLEGE: [
    ROLES.MASTER_ADMIN,
    ROLES.SUPER_ADMIN,
  ],
  ANALYTICS_DEPT: [
    ROLES.MASTER_ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.DEPT_ADMIN,
  ],
  ANALYTICS_EVENT: [
    ROLES.MASTER_ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.DEPT_ADMIN,
    ROLES.EVENT_ADMIN,
  ],

  // ── Participant list & export ─────────────────────────────────────────────
  PARTICIPANTS_READ: [
    ROLES.MASTER_ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.DEPT_ADMIN,
    ROLES.EVENT_ADMIN,
  ],

  // ── Admin user management ─────────────────────────────────────────────────
  USERS_MANAGE: [
    ROLES.MASTER_ADMIN,
  ],
});

module.exports = { ROLES, PERMISSIONS };

