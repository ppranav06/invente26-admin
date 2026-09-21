'use strict';

const admin = require('firebase-admin');
const config = require('../config');
const logger = require('./logger');
const { HttpError } = require('../utils/errors');

let app;

function getFirebaseApp() {
  if (!app) {
    if (!config.firebaseProjectId) {
      throw new Error('FIREBASE_PROJECT_ID is required');
    }
    app = admin.initializeApp({
      projectId: config.firebaseProjectId,
    });
  }
  return app;
}

/**
 * Verify a Firebase ID token issued by the client SDK.
 * Returns the decoded token payload on success.
 * Throws HttpError(401) on any failure.
 *
 * @param {string} idToken
 * @returns {Promise<import('firebase-admin').auth.DecodedIdToken>}
 */
async function verifyFirebaseToken(idToken) {
  try {
    const auth = admin.auth(getFirebaseApp());
    const decoded = await auth.verifyIdToken(idToken, /* checkRevoked= */ true);
    logger.debug({ type: 'firebase_token_verified', uid: decoded.uid, email: decoded.email }, 'Firebase token verified');
    return decoded;
  } catch (err) {
    logger.warn({ type: 'firebase_token_failed', err: { message: err.message, code: err.code } }, 'Firebase token verification failed');
    throw new HttpError(401, 'invalid or expired firebase token', 'FIREBASE_AUTH_FAILED');
  }
}

module.exports = { verifyFirebaseToken };

