'use strict';

const express = require('express');
const { authn } = require('../middleware/authn');
const { authz } = require('../middleware/authz');
const { PERMISSIONS } = require('../config/permissions');
const { asyncHandler, HttpError } = require('../utils/errors');
const {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} = require('../services/adminUserService');
const { revokeAllUserTokens } = require('../services/refreshTokenService');

const VALID_ROLES = ['master_admin', 'super_admin', 'dept_admin', 'event_admin', 'volunteer'];

function createUsersRouter({ db }) {
  const router = express.Router();
  const guard = [authn, authz(PERMISSIONS.USERS_MANAGE)];

  /** GET /users — list all admin users */
  router.get('/users', guard, asyncHandler(async (_req, res) => {
    const users = await listAdminUsers(db);
    return res.status(200).json({ rows: users });
  }));

  /**
   * POST /users — create a new admin user
   *
   * Body: { user_id, email, role, event_id?, dept_name? }
   *
   * user_id must be the Firebase UID of an existing Firebase account.
   * The Firebase account itself must be created separately (Firebase console
   * or Admin SDK create user call).
   */
  router.post('/users', guard, asyncHandler(async (req, res) => {
    const { user_id, email, role, event_id, dept_name } = req.body || {};

    if (!user_id || typeof user_id !== 'string') {
      throw new HttpError(400, 'user_id (Firebase UID) is required', 'MISSING_USER_ID');
    }
    if (!email || typeof email !== 'string') {
      throw new HttpError(400, 'email is required', 'MISSING_EMAIL');
    }
    if (!role || !VALID_ROLES.includes(role)) {
      throw new HttpError(400, `role must be one of: ${VALID_ROLES.join(', ')}`, 'INVALID_ROLE');
    }
    if (role === 'event_admin' && !event_id) {
      throw new HttpError(400, 'event_id is required for event_admin role', 'MISSING_EVENT_ID');
    }
    if (role === 'dept_admin' && !dept_name) {
      throw new HttpError(400, 'dept_name is required for dept_admin role', 'MISSING_DEPT_NAME');
    }

    const user = await createAdminUser(db, {
      userId:   user_id,
      email:    email.toLowerCase().trim(),
      role,
      eventId:  event_id  || null,
      deptName: dept_name || null,
    });

    return res.status(201).json({ user });
  }));

  /**
   * PATCH /users/:userId — update role and/or scope fields
   *
   * Revoking all existing refresh tokens ensures the user gets a fresh JWT
   * with the updated role on their next login.
   */
  router.patch('/users/:userId', guard, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role, event_id, dept_name } = req.body || {};

    if (role && !VALID_ROLES.includes(role)) {
      throw new HttpError(400, `role must be one of: ${VALID_ROLES.join(', ')}`, 'INVALID_ROLE');
    }

    const updated = await updateAdminUser(db, userId, {
      role,
      eventId:  event_id  !== undefined ? event_id  : undefined,
      deptName: dept_name !== undefined ? dept_name : undefined,
    });

    // Revoke existing refresh tokens so the user re-authenticates with the new role.
    await revokeAllUserTokens(db, userId);

    return res.status(200).json({ user: updated });
  }));

  /**
   * DELETE /users/:userId — remove from admin_users
   *
   * Does NOT delete the Firebase account. Revokes all refresh tokens first.
   */
  router.delete('/users/:userId', guard, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await revokeAllUserTokens(db, userId);
    await deleteAdminUser(db, userId);
    return res.status(200).json({ ok: true });
  }));

  return router;
}

module.exports = { createUsersRouter };

