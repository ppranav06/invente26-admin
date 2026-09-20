'use strict';

const express = require('express');
const { verifyFirebaseToken } = require('../utils/firebaseAdmin');
const { signAccessToken, signRefreshToken, verifyToken } = require('../utils/jwt');
const { findAdminUserByUid } = require('../services/adminUserService');
const { storeRefreshToken, validateRefreshToken, revokeRefreshToken } = require('../services/refreshTokenService');
const { authn } = require('../middleware/authn');
const { asyncHandler } = require('../utils/errors');
const { HttpError } = require('../utils/errors');

function createAuthRouter({ db }) {
  const router = express.Router();

  /**
   * POST /auth/login
   *
   * Body: { firebase_id_token: string }
   *
   * 1. Verify the Firebase ID token.
   * 2. Look up the Firebase UID in admin_users.
   * 3. Issue access + refresh tokens.
   */
  router.post('/auth/login', asyncHandler(async (req, res) => {
    const { firebase_id_token } = req.body || {};
    if (!firebase_id_token || typeof firebase_id_token !== 'string') {
      throw new HttpError(400, 'firebase_id_token is required', 'MISSING_FIREBASE_TOKEN');
    }

    const decoded = await verifyFirebaseToken(firebase_id_token);
    const adminUser = await findAdminUserByUid(db, decoded.uid);

    if (!adminUser) {
      throw new HttpError(401, 'account not provisioned — contact a master admin', 'NOT_PROVISIONED');
    }

    const userForToken = {
      userId:   adminUser.user_id,
      email:    adminUser.email,
      role:     adminUser.role,
      eventId:  adminUser.event_id  || null,
      deptName: adminUser.dept_name || null,
    };

    const accessToken  = signAccessToken(userForToken);
    const refreshToken = signRefreshToken(userForToken);
    await storeRefreshToken(db, adminUser.user_id, refreshToken);

    return res.status(200).json({
      access_token:  accessToken,
      refresh_token: refreshToken,
      user: {
        user_id:   adminUser.user_id,
        email:     adminUser.email,
        role:      adminUser.role,
        event_id:  adminUser.event_id  || null,
        dept_name: adminUser.dept_name || null,
      },
    });
  }));

  /**
   * POST /auth/refresh
   *
   * Body: { refresh_token: string }
   *
   * Issues a new access token if the refresh token is valid and not revoked.
   */
  router.post('/auth/refresh', asyncHandler(async (req, res) => {
    const { refresh_token } = req.body || {};
    if (!refresh_token || typeof refresh_token !== 'string') {
      throw new HttpError(400, 'refresh_token is required', 'MISSING_REFRESH_TOKEN');
    }

    // 1. Verify JWT signature + expiry
    const payload = verifyToken(refresh_token);
    if (payload.token_type !== 'refresh') {
      throw new HttpError(401, 'invalid token type', 'WRONG_TOKEN_TYPE');
    }

    // 2. Check DB (revocation, expiry)
    const row = await validateRefreshToken(db, refresh_token);
    if (!row) {
      throw new HttpError(401, 'refresh token is invalid or revoked', 'REFRESH_TOKEN_INVALID');
    }

    const accessToken = signAccessToken({
      userId:   row.user_id,
      email:    row.email,
      role:     row.role,
      eventId:  row.event_id  || null,
      deptName: row.dept_name || null,
    });

    return res.status(200).json({ access_token: accessToken });
  }));

  /**
   * POST /auth/logout
   *
   * Body: { refresh_token: string }
   *
   * Revokes the provided refresh token.
   */
  router.post('/auth/logout', authn, asyncHandler(async (req, res) => {
    const { refresh_token } = req.body || {};
    if (refresh_token && typeof refresh_token === 'string') {
      await revokeRefreshToken(db, refresh_token);
    }
    return res.status(200).json({ ok: true });
  }));

  /**
   * GET /auth/me
   *
   * Returns the authenticated user's payload decoded from the access token.
   */
  router.get('/auth/me', authn, asyncHandler(async (req, res) => {
    return res.status(200).json({ user: req.adminUser });
  }));

  return router;
}

module.exports = { createAuthRouter };

