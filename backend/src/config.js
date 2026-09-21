'use strict';

const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

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
  // Private key PEM — newlines may be escaped as \n in .env
  jwtPrivateKey: (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  jwtPublicKey: (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n'),
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
};
