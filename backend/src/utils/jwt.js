'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('./errors');
const logger = require('./logger');

/**
 * Sign an RS256 access token.
 * Payload shape: { sub, email, role, event_id?, dept_name? }
 *
 * @param {{ userId: string, email: string, role: string, event_id?: string|null, dept_name?: string|null }} user
 * @returns {string}
 */
function signAccessToken(user) {
  const payload = {
    token_type: 'access',
    sub: user.userId,
    email: user.email,
    role: user.role,
    ...(user.event_id  ? { event_id:  user.event_id  } : {}),
    ...(user.dept_name ? { dept_name: user.dept_name } : {}),
  };
  return jwt.sign(payload, config.jwtPrivateKey, {
    algorithm: 'RS256',
    expiresIn: config.accessTokenExpiresIn,
  });
}

/**
 * Sign an RS256 refresh token.
 * Deliberately minimal payload; the DB is the source of truth for validity.
 *
 * @param {{ userId: string }} user
 * @returns {string}
 */
function signRefreshToken(user) {
  return jwt.sign(
    { token_type: 'refresh', sub: user.userId },
    config.jwtPrivateKey,
    { algorithm: 'RS256', expiresIn: config.refreshTokenExpiresIn },
  );
}

/**
 * Verify any admin JWT (access or refresh).
 * Returns the decoded payload.
 * Throws HttpError(401) on failure.
 *
 * @param {string} token
 * @returns {object}
 */
function verifyToken(token) {
  try {
    if (!config.jwtPublicKey) {
      throw new Error('JWT_PUBLIC_KEY is not set');
    }
    return jwt.verify(token, config.jwtPublicKey, { algorithms: ['RS256'] });
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    logger.warn({ err: { message: err.message, name: err.name }, expired }, 'JWT verify failed');
    throw new HttpError(
      401,
      expired ? 'token expired' : 'invalid token',
      expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    );
  }
}

/**
 * Decode a JWT without verifying the signature.
 * Use only for extracting metadata when you don't need security guarantees.
 *
 * @param {string} token
 * @returns {object|null}
 */
function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = { signAccessToken, signRefreshToken, verifyToken, decodeToken };

