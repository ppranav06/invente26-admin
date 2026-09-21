'use strict';

const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      type: 'http_request',
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip,
      user_agent: req.get('user-agent'),
      request_id: req.get('x-request-id') || undefined,
      user_id: req.adminUser?.userId || undefined,
      role: req.adminUser?.role || undefined,
    }, `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms`);
  });

  next();
}

module.exports = { requestLogger };
