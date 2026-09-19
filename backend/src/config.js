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
};
