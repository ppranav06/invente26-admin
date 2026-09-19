require('dotenv').config();

const config = require('./config');
const db = require('./db');
const { createApp } = require('./app');

const server = createApp({ database: db }).listen(config.port, () => {
  console.log(`Invente'26 admin backend listening on ${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
