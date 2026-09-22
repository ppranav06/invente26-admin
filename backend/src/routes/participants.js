'use strict';

const express = require('express');
const ExcelJS = require('exceljs');
const { authn } = require('../middleware/authn');
const { authz, assertEventScope, assertDeptScope } = require('../middleware/authz');
const { PERMISSIONS } = require('../config/permissions');
const { asyncHandler, parseUuid, HttpError } = require('../utils/errors');
const { getParticipants, getAllParticipants } = require('../services/participantService');
const { getEventAnalyticsById } = require('../services/analyticsService');

function createParticipantsRouter({ db }) {
  const router = express.Router();

  /**
   * Resolve scope for the requesting user against a given event.
   * Fetches the event's dept_name and runs assertEventScope / assertDeptScope.
   *
   * @param {object} adminUser - req.adminUser
   * @param {string} eventId
   * @returns {Promise<{ dept_name: string }>} event row
   */
  async function resolveScope(adminUser, eventId) {
    const event = await getEventAnalyticsById(db, eventId);
    if (!event) {
      throw new HttpError(404, 'event not found', 'EVENT_NOT_FOUND');
    }

    assertEventScope(adminUser, eventId);
    if (adminUser.role === 'dept_admin') {
      assertDeptScope(adminUser, event.dept_name);
    }

    return event;
  }

  /**
   * GET /events/:eventId/participants
   *
   * Paginated participant list.
   * Query: ?page, ?limit (max 200), ?status, ?college, ?search
   */
  router.get(
    '/events/:eventId/participants',
    authn, authz(PERMISSIONS.PARTICIPANTS_READ),
    asyncHandler(async (req, res) => {
      const eventId = parseUuid(req.params.eventId, 'eventId');
      const event = await resolveScope(req.adminUser, eventId);

      const data = await getParticipants(db, eventId, {
        page:    req.query.page,
        limit:   req.query.limit,
        status:  req.query.status,
        college: req.query.college,
        search:  req.query.search,
      });

      return res.status(200).json({
        ...data,
        event: {
          event_id: event.event_id,
          name: event.name,
          dept_name: event.dept_name,
          event_type: event.event_type,
          date: event.date,
          reg_count: Number(event.reg_count),
          attend_count: Number(event.attend_count),
        },
      });
    }),
  );

  /**
   * GET /events/:eventId/participants/export
   *
   * Streams an Excel (.xlsx) file with all matching participants.
   * Supports the same ?status and ?college filters.
   */
  router.get(
    '/events/:eventId/participants/export',
    authn, authz(PERMISSIONS.PARTICIPANTS_READ),
    asyncHandler(async (req, res) => {
      const eventId = parseUuid(req.params.eventId, 'eventId');
      const event   = await resolveScope(req.adminUser, eventId);
      const rows    = await getAllParticipants(db, eventId, {
        status:  req.query.status,
        college: req.query.college,
        search:  req.query.search,
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Invente26 Admin';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Participants');

      sheet.columns = [
        { header: 'Name',               key: 'name',               width: 28 },
        { header: 'Email',              key: 'email',              width: 32 },
        { header: 'Phone',              key: 'phone',              width: 16 },
        { header: 'College',            key: 'college_name',       width: 36 },
        { header: 'Year of Study',      key: 'year_of_study',      width: 14 },
        { header: 'Gender',             key: 'gender',             width: 10 },
        { header: 'Ticket ID',          key: 'ticket_id',          width: 38 },
        { header: 'Ticket Type',        key: 'ticket_type',        width: 16 },
        { header: 'Payment Status',     key: 'payment_status',     width: 18 },
        { header: 'Registered At',      key: 'registered_at',      width: 22 },
        { header: 'Attended',           key: 'attendance',         width: 10 },
        { header: 'Attendance Time',    key: 'attendance_timestamp', width: 22 },
      ];

      // Bold header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      };

      rows.forEach((row) => {
        sheet.addRow({
          ...row,
          attendance: row.attendance ? 'Yes' : 'No',
          registered_at:        row.registered_at        ? new Date(row.registered_at).toLocaleString('en-IN')        : '',
          attendance_timestamp: row.attendance_timestamp ? new Date(row.attendance_timestamp).toLocaleString('en-IN') : '',
        });
      });

      // Auto-freeze header row
      sheet.views = [{ state: 'frozen', ySplit: 1 }];

      const safeName = (event.name || 'event').replace(/[^a-z0-9]/gi, '_').slice(0, 40);
      const filename  = `participants_${safeName}_${Date.now()}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      await workbook.xlsx.write(res);
      res.end();
    }),
  );

  return router;
}

module.exports = { createParticipantsRouter };
