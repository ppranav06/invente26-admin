'use strict';

const express = require('express');
const crypto = require('crypto');
const admin = require('firebase-admin');
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
   * POST /users — create a new admin user + Firebase account
   *
   * Body: { email, role, event_id?, dept_name? }
   *
   * 1. Generates a UUID as the user_id (also used as Firebase UID).
   * 2. Creates a Firebase user account with a random temporary password.
   * 3. Generates a password-reset link the admin can share with the user.
   * 4. Inserts the row into admin_users.
   */
  router.post('/users', guard, asyncHandler(async (req, res) => {
    const { email, role, event_id, dept_name } = req.body || {};

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

    const normalizedEmail = email.toLowerCase().trim();
    const userId = crypto.randomUUID();

    // Create Firebase user account with a random temp password.
    // The user will reset it via the password-reset link.
    let firebaseCreated = false;
    let passwordResetLink = null;

    try {
      const tempPassword = crypto.randomBytes(16).toString('base64url');
      await admin.auth().createUser({
        uid: userId,
        email: normalizedEmail,
        password: tempPassword,
        emailVerified: false,
      });
      firebaseCreated = true;

      // Generate a password-reset link so the user can set their own password.
      passwordResetLink = await admin.auth().generatePasswordResetLink(normalizedEmail);
    } catch (firebaseErr) {
      // If the Firebase user already exists, try to generate a reset link for them.
      if (firebaseErr.code === 'auth/email-already-exists') {
        try {
          const existingUser = await admin.auth().getUserByEmail(normalizedEmail);
          passwordResetLink = await admin.auth().generatePasswordResetLink(normalizedEmail);
          // Use the existing Firebase UID for the admin_users row
          // so the two stay in sync.
          return res.status(201).json({
            user: await createAdminUser(db, {
              userId: existingUser.uid,
              email: normalizedEmail,
              role,
              eventId: event_id || null,
              deptName: dept_name || null,
            }),
            password_reset_link: passwordResetLink,
          });
        } catch (linkErr) {
          // Fall through — we'll still create the DB row but warn about Firebase.
          console.error('Could not generate reset link for existing Firebase user:', linkErr);
        }
      } else {
        console.error('Firebase user creation failed:', firebaseErr);
      }
    }

    // Insert into admin_users regardless of Firebase outcome.
    const user = await createAdminUser(db, {
      userId,
      email: normalizedEmail,
      role,
      eventId: event_id || null,
      deptName: dept_name || null,
    });

    return res.status(201).json({
      user,
      password_reset_link: passwordResetLink,
      firebase_created: firebaseCreated,
    });
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
