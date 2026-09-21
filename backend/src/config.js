'use strict';

const crypto = require('crypto');

const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

// ── JWT key loading ────────────────────────────────────────────────────────
const jwtPrivateKey = (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
let jwtPublicKey   = (process.env.JWT_PUBLIC_KEY  || '').replace(/\\n/g, '\n');

// Auto-derive public key from private key when not explicitly provided
if (jwtPrivateKey && !jwtPublicKey) {
  try {
    const privateKeyObj  = crypto.createPrivateKey(jwtPrivateKey);
    const publicKeyObj   = crypto.createPublicKey(privateKeyObj);
    jwtPublicKey = publicKeyObj.export({ type: 'spki', format: 'pem' });
    console.log('[config] Derived JWT_PUBLIC_KEY from JWT_PRIVATE_KEY');
  } catch (err) {
    console.error(`[config] Could not derive public key from JWT_PRIVATE_KEY: ${err.message}`);
  }
}

module.exports = {
  port: numberFromEnv('PORT', 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  frontendOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  dbPoolMax: numberFromEnv('DB_POOL_MAX', 10),
  dbIdleTimeoutMs: numberFromEnv('DB_IDLE_TIMEOUT_MS', 30_000),
  dbConnectionTimeoutMs: numberFromEnv('DB_CONNECTION_TIMEOUT_MS', 5_000),
  dbQueryTimeoutMs: numberFromEnv('DB_QUERY_TIMEOUT_MS', 10_000),

  // Master admin local login (bypasses Firebase)
  masterAdminEmail: process.env.MASTER_ADMIN_EMAIL || '',
  masterAdminPassword: process.env.MASTER_ADMIN_PASSWORD || '',

  // Firebase
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebaseServiceAccountFile: process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '',

  // JWT (RS256)
  jwtPrivateKey,
  jwtPublicKey,
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
};
