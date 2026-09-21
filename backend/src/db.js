const { Pool } = require('pg');
const config = require('./config');
const logger = require('./utils/logger');

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required to start the backend');
}

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  idleTimeoutMillis: config.dbIdleTimeoutMs,
  connectionTimeoutMillis: config.dbConnectionTimeoutMs,
  statement_timeout: config.dbQueryTimeoutMs,
});

pool.on('error', (error) => {
  logger.error({ type: 'db_pool_error', err: { message: error.message, code: error.code } }, 'Unexpected PostgreSQL pool error');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  end: () => pool.end(),
};
