require('dotenv').config();

const config = require('./config');
const db = require('./db');
const logger = require('./utils/logger');
const { createApp } = require('./app');

const server = createApp({ database: db }).listen(config.port, () => {
  logger.info({ type: 'server_start', port: config.port }, `Invente'26 admin backend listening on ${config.port}`);
});

async function shutdown(signal) {
  logger.info({ type: 'server_shutdown', signal }, `${signal} received; shutting down`);
  server.close(async () => {
    await db.end();
    logger.info({ type: 'server_stopped' }, 'Server stopped');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.fatal({ type: 'uncaught_exception', err: { message: error.message, stack: error.stack } }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ type: 'unhandled_rejection', reason: String(reason) }, 'Unhandled promise rejection');
});
