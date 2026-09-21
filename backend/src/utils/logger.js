'use strict';

const pino = require('pino');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOKI_URL = process.env.LOKI_URL || '';
const LOKI_BASIC_AUTH = process.env.LOKI_BASIC_AUTH || '';
const LOG_PRETTY = process.env.LOG_PRETTY === 'true';
const SERVICE_NAME = process.env.SERVICE_NAME || 'invente26-admin-backend';

const base = {
  level: LOG_LEVEL,
  service: SERVICE_NAME,
  timestamp: pino.stdTimeFunctions.isoTime,
};

const transports = [];

// Pretty-print to stdout in development
if (LOG_PRETTY || (!LOKI_URL && process.env.NODE_ENV !== 'production')) {
  transports.push({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
    },
  });
} else {
  // JSON to stdout (production default — Loki or any log aggregator reads this)
  transports.push({ target: 'pino/file', options: { destination: 1 } });
}

// Loki transport — sends logs over HTTP to a Grafana Loki instance
if (LOKI_URL) {
  const lokiOptions = {
    labels: { service: SERVICE_NAME },
    batchInterval: 5000,
    batchSize: 100,
    clearOnError: false,
  };

  if (LOKI_BASIC_AUTH) {
    const [username, password] = LOKI_BASIC_AUTH.split(':');
    lokiOptions.basicAuth = { username, password };
  }

  transports.push({
    target: 'pino-loki',
    options: {
      host: LOKI_URL,
      ...lokiOptions,
    },
  });
}

const logger = pino({ ...base }, pino.transport({ targets: transports }));

module.exports = logger;
