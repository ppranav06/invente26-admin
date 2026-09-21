'use strict';

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const config = require('../config');
const logger = require('./logger');
const { HttpError } = require('./errors');

let app;

function getCertCredential(serviceAccount) {
  if (serviceAccount && serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  const certFn = admin.cert || (admin.credential && admin.credential.cert);
  if (!certFn) {
    throw new Error('Firebase Admin cert initializer not available');
  }
  return certFn(serviceAccount);
}

function getFirebaseApp() {
  if (!app) {
    if (!config.firebaseProjectId) {
      throw new Error('FIREBASE_PROJECT_ID is required');
    }

    const credentialOptions = {};

    // 1. Service account JSON file via FIREBASE_SERVICE_ACCOUNT_FILE config
    if (config.firebaseServiceAccountFile) {
      const filePath = path.resolve(config.firebaseServiceAccountFile);
      if (!fs.existsSync(filePath)) {
        throw new Error(`FIREBASE_SERVICE_ACCOUNT_FILE not found: ${filePath}`);
      }
      const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      credentialOptions.credential = getCertCredential(serviceAccount);
      logger.info({
        type: 'firebase_init',
        method: 'service_account_file',
        path: filePath,
        project_id: serviceAccount.project_id || config.firebaseProjectId,
        client_email: serviceAccount.client_email,
      }, 'Firebase Admin initialized with service account file');
    }
    // 2. GOOGLE_APPLICATION_CREDENTIALS env var (JSON string or file path)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const rawGac = process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();
      let serviceAccount;
      if (rawGac.startsWith('{')) {
        serviceAccount = JSON.parse(rawGac);
      } else {
        const filePath = path.resolve(rawGac);
        if (!fs.existsSync(filePath)) {
          throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${filePath}`);
        }
        serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }

      credentialOptions.credential = getCertCredential(serviceAccount);
      logger.info({
        type: 'firebase_init',
        method: 'google_application_credentials',
        project_id: serviceAccount.project_id || config.firebaseProjectId,
        client_email: serviceAccount.client_email,
      }, 'Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS');
    }
    // 3. Fall back — no explicit creds; SDK will attempt ADC (works on GCP only)
    else {
      credentialOptions.projectId = config.firebaseProjectId;
      logger.warn({ type: 'firebase_init', method: 'no_credentials', project_id: config.firebaseProjectId }, 'Firebase Admin initialized without explicit credentials — token verification may fail outside GCP');
    }

    app = admin.initializeApp(credentialOptions);
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
    const firebaseApp = getFirebaseApp();
    const auth = typeof admin.auth === 'function' ? admin.auth(firebaseApp) : getAuth(firebaseApp);
    const decoded = await auth.verifyIdToken(idToken, /* checkRevoked= */ true);
    logger.debug({ type: 'firebase_token_verified', uid: decoded.uid, email: decoded.email }, 'Firebase token verified');
    return decoded;
  } catch (err) {
    logger.warn({
      type: 'firebase_token_failed',
      firebase_error: err.message,
      firebase_error_code: err.code,
      token_prefix: idToken ? idToken.substring(0, 20) + '...' : null,
      token_length: idToken ? idToken.length : 0,
      configured_project_id: config.firebaseProjectId,
    }, 'Firebase token verification failed');
    throw new HttpError(401, 'invalid or expired firebase token', 'FIREBASE_AUTH_FAILED');
  }
}

module.exports = { verifyFirebaseToken };
