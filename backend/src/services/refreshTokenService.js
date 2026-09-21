'use strict';

const crypto = require('crypto');
const { decodeToken } = require('../utils/jwt');

/**
 * Hash a raw refresh token for DB storage.
 * SHA-256 hex string — never store the raw token.
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Persist a refresh token (hashed) for the given user.
 *
 * @param {object} db
 * @param {string} userId - Firebase UID
 * @param {string} rawToken - the raw JWT string
 */
async function storeRefreshToken(db, userId, rawToken) {
  const decoded = decodeToken(rawToken);
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO public.admin_refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(rawToken), expiresAt],
  );
}

/**
 * Validate a refresh token:
 *  1. Verify the JWT signature (via verifyToken in the caller).
 *  2. Look up the hash in the DB.
 *  3. Check it is not revoked and not expired.
 *
 * Returns the admin_users row for the token's owner, or null if invalid.
 *
 * @param {object} db
 * @param {string} rawToken
 * @returns {Promise<object|null>}
 */
async function validateRefreshToken(db, rawToken) {
  const result = await db.query(
    `SELECT rt.user_id, rt.revoked, rt.expires_at,
            au.email, au.role, au.event_id, au.dept_name
     FROM public.admin_refresh_tokens rt
     JOIN public.admin_users au ON au.user_id = rt.user_id
     WHERE rt.token_hash = $1`,
    [hashToken(rawToken)],
  );

  const row = result.rows[0];
  if (!row) return null;
  if (row.revoked) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  return row;
}

/**
 * Revoke a specific refresh token (e.g. on logout).
 *
 * @param {object} db
 * @param {string} rawToken
 */
async function revokeRefreshToken(db, rawToken) {
  await db.query(
    `UPDATE public.admin_refresh_tokens
     SET revoked = TRUE
     WHERE token_hash = $1`,
    [hashToken(rawToken)],
  );
}

/**
 * Revoke all refresh tokens for a user (e.g. on role change or account removal).
 *
 * @param {object} db
 * @param {string} userId
 */
async function revokeAllUserTokens(db, userId) {
  await db.query(
    `UPDATE public.admin_refresh_tokens
     SET revoked = TRUE
     WHERE user_id = $1 AND revoked = FALSE`,
    [userId],
  );
}

module.exports = {
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};

