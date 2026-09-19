class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED') {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function parseUuid(value, fieldName) {
  const uuid = typeof value === 'string' ? value.trim() : '';
  // Accept UUIDv7 values used by the live schema as well as older UUID versions.
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);

  if (!valid) {
    throw new HttpError(400, `${fieldName} must be a valid UUID`, 'INVALID_UUID');
  }

  return uuid.toLowerCase();
}

module.exports = { HttpError, asyncHandler, parseUuid };
