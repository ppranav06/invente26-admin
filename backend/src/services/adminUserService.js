'use strict';

const { HttpError } = require('../utils/errors');

// ── Queries ───────────────────────────────────────────────────────────────────

const SELECT_BY_UID = `
  SELECT user_id, email, role, event_id, dept_name, created_at, updated_at
  FROM public.admin_users
  WHERE user_id = $1
`;

const SELECT_ALL = `
  SELECT user_id, email, role, event_id, dept_name, created_at, updated_at
  FROM public.admin_users
  ORDER BY role, email
`;

const INSERT_USER = `
  INSERT INTO public.admin_users (user_id, email, role, event_id, dept_name)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING user_id, email, role, event_id, dept_name, created_at, updated_at
`;

const DELETE_USER = `
  DELETE FROM public.admin_users
  WHERE user_id = $1
  RETURNING user_id
`;

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Find an admin user by their Firebase UID.
 * Returns null when not found.
 */
async function findAdminUserByUid(db, uid) {
  const result = await db.query(SELECT_BY_UID, [uid]);
  return result.rows[0] || null;
}

/** List all admin users. */
async function listAdminUsers(db) {
  const result = await db.query(SELECT_ALL);
  return result.rows;
}

/**
 * Create a new admin user record.
 *
 * @param {object} db
 * @param {{ userId: string, email: string, role: string, eventId?: string|null, deptName?: string|null }} data
 */
async function createAdminUser(db, { userId, email, role, eventId = null, deptName = null }) {
  const result = await db.query(INSERT_USER, [userId, email, role, eventId || null, deptName || null]);
  return result.rows[0];
}

/**
 * Update role and/or scope fields for an admin user.
 *
 * @param {object} db
 * @param {string} userId
 * @param {{ role?: string, eventId?: string|null, deptName?: string|null }} fields
 */
async function updateAdminUser(db, userId, fields) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  if (fields.role !== undefined) {
    setClauses.push(`role = $${idx++}`);
    values.push(fields.role);
  }
  if (fields.eventId !== undefined) {
    setClauses.push(`event_id = $${idx++}`);
    values.push(fields.eventId || null);
  }
  if (fields.deptName !== undefined) {
    setClauses.push(`dept_name = $${idx++}`);
    values.push(fields.deptName || null);
  }

  if (setClauses.length === 0) {
    throw new HttpError(400, 'no fields to update', 'NO_UPDATE_FIELDS');
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(userId);

  const sql = `
    UPDATE public.admin_users
    SET ${setClauses.join(', ')}
    WHERE user_id = $${idx}
    RETURNING user_id, email, role, event_id, dept_name, created_at, updated_at
  `;

  const result = await db.query(sql, values);
  if (!result.rows[0]) {
    throw new HttpError(404, 'admin user not found', 'USER_NOT_FOUND');
  }
  return result.rows[0];
}

/** Remove an admin user record. Does NOT delete the Firebase account. */
async function deleteAdminUser(db, userId) {
  const result = await db.query(DELETE_USER, [userId]);
  if (!result.rows[0]) {
    throw new HttpError(404, 'admin user not found', 'USER_NOT_FOUND');
  }
}

module.exports = {
  findAdminUserByUid,
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
};

