'use strict';

const admin = require('firebase-admin');
const config = require('../config');
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
    return await auth.verifyIdToken(idToken, /* checkRevoked= */ true);
  } catch (err) {
    throw new HttpError(401, 'invalid or expired firebase token', 'FIREBASE_AUTH_FAILED');
  }
}

module.exports = { verifyFirebaseToken };

