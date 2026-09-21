'use strict';

const express = require('express');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { verifyFirebaseToken } = require('../utils/firebaseAdmin');
const { signAccessToken, signRefreshToken, verifyToken } = require('../utils/jwt');
const { findAdminUserByUid, findAdminUserByEmail, createAdminUser } = require('../services/adminUserService');
const { storeRefreshToken, validateRefreshToken, revokeRefreshToken } = require('../services/refreshTokenService');
const { authn } = require('../middleware/authn');
const { asyncHandler } = require('../utils/errors');
const { HttpError } = require('../utils/errors');

function issueTokens(db, adminUser) {
  const userForToken = {
    userId:   adminUser.user_id,
    email:    adminUser.email,
    role:     adminUser.role,
    eventId:  adminUser.event_id  || null,
    deptName: adminUser.dept_name || null,
  };

  const accessToken  = signAccessToken(userForToken);
  const refreshToken = signRefreshToken(userForToken);
  return { accessToken, refreshToken, user: userForToken };
}

function createAuthRouter({ db }) {
  const router = express.Router();

  /**
   * POST /auth/login
   *
   * Supports two modes:
   *   1. { firebase_id_token }  — Firebase ID token → lookup admin_users → issue JWT
   *   2. { email, password }    — Master admin local auth against env credentials
   */
  router.post('/auth/login', asyncHandler(async (req, res) => {
    const { firebase_id_token, email, password } = req.body || {};

    // ── Mode 1: Master admin local login ───────────────────────────────────
    if (email && password && !firebase_id_token) {
      if (!config.masterAdminEmail || !config.masterAdminPassword) {
        logger.warn({ type: 'auth_login', method: 'local', reason: 'disabled' }, 'Local login disabled');
        throw new HttpError(401, 'local login is not configured', 'LOCAL_LOGIN_DISABLED');
      }

      if (email.toLowerCase().trim() !== config.masterAdminEmail.toLowerCase().trim() || password !== config.masterAdminPassword) {
        logger.warn({ type: 'auth_login', method: 'local', email: email.toLowerCase().trim(), reason: 'invalid_credentials' }, 'Local login failed');
        throw new HttpError(401, 'invalid email or password', 'INVALID_CREDENTIALS');
      }

      // Auto-create the master admin user in DB if not present
      let adminUser = await findAdminUserByEmail(db, email);
      let created = false;
      if (!adminUser) {
        adminUser = await createAdminUser(db, {
          userId:  `local-${crypto.randomUUID()}`,
          email:   email.toLowerCase().trim(),
          role:    'master_admin',
        });
        created = true;
      }

      const tokens = await issueTokens(db, adminUser);
      await storeRefreshToken(db, adminUser.user_id, tokens.refreshToken);

      logger.info({ type: 'auth_login', method: 'local', user_id: adminUser.user_id, email: adminUser.email, role: adminUser.role, auto_created: created }, 'Master admin logged in');

      return res.status(200).json({
        access_token:  tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          user_id:   adminUser.user_id,
          email:     adminUser.email,
          role:      adminUser.role,
          event_id:  adminUser.event_id  || null,
          dept_name: adminUser.dept_name || null,
        },
      });
    }

    // ── Mode 2: Firebase ID token ──────────────────────────────────────────
    if (firebase_id_token) {
      const decoded = await verifyFirebaseToken(firebase_id_token);
      const adminUser = await findAdminUserByUid(db, decoded.uid);

      if (!adminUser) {
        logger.warn({ type: 'auth_login', method: 'firebase', uid: decoded.uid, reason: 'not_provisioned' }, 'Firebase login failed: not provisioned');
        throw new HttpError(401, 'account not provisioned — contact a master admin', 'NOT_PROVISIONED');
      }

      const tokens = await issueTokens(db, adminUser);
      await storeRefreshToken(db, adminUser.user_id, tokens.refreshToken);

      logger.info({ type: 'auth_login', method: 'firebase', user_id: adminUser.user_id, email: adminUser.email, role: adminUser.role }, 'User logged in via Firebase');

      return res.status(200).json({
        access_token:  tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          user_id:   adminUser.user_id,
          email:     adminUser.email,
          role:      adminUser.role,
          event_id:  adminUser.event_id  || null,
          dept_name: adminUser.dept_name || null,
        },
      });
    }

    throw new HttpError(400, 'firebase_id_token or email+password is required', 'MISSING_CREDENTIALS');
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

    const payload = verifyToken(refresh_token);
    if (payload.token_type !== 'refresh') {
      throw new HttpError(401, 'invalid token type', 'WRONG_TOKEN_TYPE');
    }

    const row = await validateRefreshToken(db, refresh_token);
    if (!row) {
      logger.warn({ type: 'auth_refresh', reason: 'invalid_or_revoked' }, 'Token refresh failed');
      throw new HttpError(401, 'refresh token is invalid or revoked', 'REFRESH_TOKEN_INVALID');
    }

    const accessToken = signAccessToken({
      userId:   row.user_id,
      email:    row.email,
      role:     row.role,
      eventId:  row.event_id  || null,
      deptName: row.dept_name || null,
    });

    logger.info({ type: 'auth_refresh', user_id: row.user_id }, 'Token refreshed');
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
    logger.info({ type: 'auth_logout', user_id: req.adminUser?.userId }, 'User logged out');
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
