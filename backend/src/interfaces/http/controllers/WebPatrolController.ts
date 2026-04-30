/**
 * Web Patrol Controller
 */

import { Op } from 'sequelize';
import { asyncHandler } from '../middleware/errorHandler';
import { renderView } from '../../web/config/ejs';
import { setFlashMessage } from '../../web/config/ejs';
import models from '../../../infrastructure/database/models/index.js';

export class WebPatrolController {
  getIndex = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const status = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim();

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const include: any[] = [
      { model: models.User, as: 'guard', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { model: models.Site, as: 'site', attributes: ['id', 'name', 'code'] },
      { model: models.PatrolTemplate, as: 'template', attributes: ['id', 'name', 'code'] },
    ];

    if (search) {
      where[Op.or] = [
        { status: { [Op.like]: `%${search}%` } },
        { '$site.name$': { [Op.like]: `%${search}%` } },
        { '$template.name$': { [Op.like]: `%${search}%` } },
      ];
    }

    const result = await models.PatrolRun.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['scheduled_start', 'DESC']],
      distinct: true,
    });

    const patrols = result.rows.map((run: any) => ({
      id: run.id,
      status: run.status,
      scheduledStart: run.scheduled_start,
      scheduledEnd: run.scheduled_end,
      actualStart: run.actual_start,
      actualEnd: run.actual_end,
      completionPercentage: Number(run.completion_percentage || 0),
      checkpointsCompleted: run.checkpoints_completed,
      checkpointsTotal: run.checkpoints_total,
      guard: run.guard
        ? {
            id: run.guard.id,
            firstName: run.guard.first_name,
            lastName: run.guard.last_name,
            email: run.guard.email,
          }
        : null,
      site: run.site ? { id: run.site.id, name: run.site.name, code: run.site.code } : null,
      template: run.template
        ? { id: run.template.id, name: run.template.name, code: run.template.code }
        : null,
    }));

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil((result.count || 0) / limit),
      total: result.count || 0,
      limit,
      from: result.count ? offset + 1 : 0,
      to: Math.min(page * limit, result.count || 0),
      prevPage: page > 1 ? page - 1 : null,
      nextPage: result.count > page * limit ? page + 1 : null,
    };

    renderView(res, 'patrols/index', {
      title: 'Patrols - PatrolManager',
      patrols,
      pagination,
      filters: { status, search },
    });
  });

  getDetail = asyncHandler(async (req, res) => {
    const patrolId = Number(req.params.id);

    const run: any = await models.PatrolRun.findByPk(patrolId, {
      include: [
        { model: models.User, as: 'guard', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: models.Site, as: 'site', attributes: ['id', 'name', 'code'] },
        { model: models.PatrolTemplate, as: 'template', attributes: ['id', 'name', 'code'] },
        {
          model: models.PatrolCheckpointLog,
          as: 'checkpoint_logs',
          include: [
            { model: models.Checkpoint, as: 'checkpoint', attributes: ['id', 'name', 'code'] },
          ],
        },
      ],
    });

    if (!run) {
      setFlashMessage(req as any, 'error', 'Patrol run not found');
      return res.redirect('/patrols');
    }

    const patrol = {
      id: run.id,
      status: run.status,
      scheduledStart: run.scheduled_start,
      scheduledEnd: run.scheduled_end,
      actualStart: run.actual_start,
      actualEnd: run.actual_end,
      completionPercentage: Number(run.completion_percentage || 0),
      checkpointsCompleted: run.checkpoints_completed,
      checkpointsTotal: run.checkpoints_total,
      totalDistanceMeters: run.total_distance_meters,
      guard: run.guard
        ? {
            firstName: run.guard.first_name,
            lastName: run.guard.last_name,
            email: run.guard.email,
          }
        : null,
      site: run.site ? { name: run.site.name, code: run.site.code } : null,
      template: run.template ? { name: run.template.name, code: run.template.code } : null,
      checkpointLogs: (run.checkpoint_logs || []).map((log: any) => ({
        id: log.id,
        checkpoint: log.checkpoint
          ? { name: log.checkpoint.name, code: log.checkpoint.code }
          : null,
        verificationType: log.verification_type,
        verifiedAt: log.verified_at,
        isValid: log.is_valid,
      })),
    };

    renderView(res, 'patrols/detail', {
      title: `Patrol #${patrol.id} - PatrolManager`,
      patrol,
    });
  });
}

export default new WebPatrolController();
