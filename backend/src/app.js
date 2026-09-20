const express = require('express');
const cors = require('cors');
const config = require('./config');
const { createScanRouter } = require('./routes/scan');
const { createEventsRouter } = require('./routes/events');
const { createAuthRouter } = require('./routes/auth');
const { createUsersRouter } = require('./routes/users');
const { createAnalyticsRouter } = require('./routes/analytics');
const { createParticipantsRouter } = require('./routes/participants');
const { HttpError } = require('./utils/errors');

function createApp({ database } = {}) {
  const databaseClient = database || require('./db');
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({
    origin: config.frontendOrigins.length === 1 ? config.frontendOrigins[0] : config.frontendOrigins,
  }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/organizers/api', createAuthRouter({ db: databaseClient }));
  app.use('/organizers/api', createUsersRouter({ db: databaseClient }));
  app.use('/organizers/api', createAnalyticsRouter({ db: databaseClient }));
  app.use('/organizers/api', createParticipantsRouter({ db: databaseClient }));
  app.use('/organizers/api', createScanRouter({ db: databaseClient }));
  app.use('/organizers/api', createEventsRouter({ db: databaseClient }));

  app.use((req, _res, next) => {
    next(new HttpError(404, 'route not found', 'ROUTE_NOT_FOUND'));
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    console.error('Unhandled API error:', error);
    return res.status(500).json({ error: 'server error', code: 'SERVER_ERROR' });
  });

  return app;
}

module.exports = { createApp };
