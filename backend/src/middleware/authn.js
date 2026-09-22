'use strict';

const { verifyToken } = require('../utils/jwt');
const { HttpError } = require('../utils/errors');

/**
 * Authentication middleware.
 *
 * Reads the Bearer token from the Authorization header, verifies it as an
 * access token, and attaches the decoded payload to req.adminUser.
 *
 * Returns 401 if the header is missing, the token is malformed/expired, or
 * the token_type is not 'access'.
 */
function authn(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'authorization header missing or malformed', 'MISSING_TOKEN'));
  }

  try {
    const payload = verifyToken(token);

    if (payload.token_type !== 'access') {
      return next(new HttpError(401, 'invalid token type', 'WRONG_TOKEN_TYPE'));
    }

    req.adminUser = {
      userId:    payload.sub,
      email:     payload.email,
      role:      payload.role,
      event_id:  payload.event_id  || null,
      dept_name: payload.dept_name || null,
    };

    next();
  } catch (err) {
    next(err); // HttpError(401) from verifyToken
  }
}

module.exports = { authn };

