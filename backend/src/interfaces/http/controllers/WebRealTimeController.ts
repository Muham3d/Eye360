/**
 * Web Real-time Controller
 *
 * Handles the Command Center dashboard views and API endpoints.
 * Provides SOS alert management and real-time statistics.
 *
 * @module interfaces/http/controllers/WebRealTimeController
 */

import type { Request, Response, NextFunction } from 'express';
import { getRealTimeService, getSiteService } from '../../../core/services/index';
import { asyncHandler } from '../middleware/errorHandler';
import { renderView } from '../../web/config/ejs';
import {
  SequelizeSOSAlertRepository,
  SequelizeLocationHistoryRepository
} from '../../../infrastructure/database/repositories/index';
import { SOSStatus } from '../../../core/domain/entities/SOSAlert';
import logger from '../../../infrastructure/config/logger';
import { AppError } from '../../../core/domain/errors/index';

export class WebRealTimeController {
  private readonly sosAlertRepository: SequelizeSOSAlertRepository;
  private readonly locationHistoryRepository: SequelizeLocationHistoryRepository;

  constructor() {
    this.sosAlertRepository = new SequelizeSOSAlertRepository();
    this.locationHistoryRepository = new SequelizeLocationHistoryRepository();
  }

  /**
   * GET /command-center
   * Render the Live Map and Guard Tracking Dashboard
   */
  getDashboard = asyncHandler(async (req: res) => {
    const siteService = getSiteService();
    const realTimeService = getRealTimeService();

    const sites = await siteService.listSites({ status: 'active', limit: 100 });
    const activeGuards = await realTimeService.getActiveGuardsFromDB();

    // Get initial SOS stats for dashboard
    const sosStats = await this.sosAlertRepository.getStatistics();

    renderView(res, 'dashboard/command-center', {
      title: 'Command Center - PatrolManager',
      sites: sites.data,
      activeGuards,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      initialStats: {
        activeAlerts: sosStats.activeAlerts,
        totalAlerts: sosStats.totalAlerts,
      },
    });
  });

  /**
   * GET /api/v1/dashboard/sos/active
   * Get active SOS alerts for dashboard
   */
  getActiveSOSAlerts = asyncHandler(async (req: Request, res: Response) => {
    const alerts = await this.sosAlertRepository.findActive();
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  });

  /**
   * GET /api/v1/dashboard/sos/recent?limit=20
   * Get recent SOS alerts
   */
  getRecentSOSAlerts = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const alerts = await this.sosAlertRepository.findRecent(limit);
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  });

  /**
   * GET /api/v1/dashboard/sos/:id
   * Get SOS alert by ID
   */
  getSOSAlertById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('Invalid SOS alert ID', 400, 'INVALID_ID');
    }

    const alert = await this.sosAlertRepository.findById(id);
    if (!alert) {
      throw new AppError('SOS alert not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: alert,
    });
  });

  /**
   * POST /api/v1/dashboard/sos/:id/acknowledge
   * Acknowledge an SOS alert
   */
  acknowledgeSOS = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const acknowledgedById = (req as any).user?.id;

    if (!acknowledgedById) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const alert = await this.sosAlertRepository.acknowledge(id, { acknowledgedById });
    logger.info(`SOS Alert ${id} acknowledged by user ${acknowledgedById}`);

    res.json({
      success: true,
      data: alert,
      message: 'SOS alert acknowledged',
    });
  });

  /**
   * POST /api/v1/dashboard/sos/:id/dispatch
   * Dispatch help to SOS location
   */
  dispatchSOS = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { dispatchedToId } = req.body;

    if (!dispatchedToId) {
      throw new AppError('dispatchedToId is required', 400, 'MISSING_FIELD');
    }

    const alert = await this.sosAlertRepository.dispatch(id, { dispatchedToId });
    logger.info(`SOS Alert ${id} dispatched to guard ${dispatchedToId}`);

    res.json({
      success: true,
      data: alert,
      message: 'Help dispatched to SOS location',
    });
  });

  /**
   * POST /api/v1/dashboard/sos/:id/resolve
   * Resolve an SOS alert
   */
  resolveSOS = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { status, resolutionNotes } = req.body;
    const resolvedById = (req as any).user?.id;

    if (!resolvedById) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (!status || !['resolved', 'false_alarm'].includes(status)) {
      throw new AppError('Invalid status. Must be "resolved" or "false_alarm"', 400, 'INVALID_STATUS');
    }

    const alertStatus = status === 'false_alarm' ? SOSStatus.FALSE_ALARM : SOSStatus.RESOLVED;
    const alert = await this.sosAlertRepository.resolve(id, {
      resolvedById,
      status: alertStatus,
      resolutionNotes,
    });

    logger.info(`SOS Alert ${id} resolved as ${status} by user ${resolvedById}`);

    res.json({
      success: true,
      data: alert,
      message: 'SOS alert resolved',
    });
  });

  /**
   * GET /api/v1/dashboard/sos/:id/nearby-guards?radius=500
   * Get nearby guards for an SOS alert
   */
  getNearbyGuards = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const radius = req.query.radius ? parseInt(req.query.radius as string) : 500;

    const alert = await this.sosAlertRepository.findById(id);
    if (!alert) {
      throw new AppError('SOS alert not found', 404, 'NOT_FOUND');
    }

    const nearbyGuards = await this.sosAlertRepository.findNearbyGuards(
      alert.location.latitude,
      alert.location.longitude,
      radius,
      alert.guardId
    );

    res.json({
      success: true,
      data: nearbyGuards,
      count: nearbyGuards.length,
      radius: radius,
    });
  });

  /**
   * GET /api/v1/dashboard/statistics
   * Get dashboard statistics
   */
  getDashboardStatistics = asyncHandler(async (req: Request, res: Response) => {
    const [sosStats, locationStats, activeGuards] = await Promise.all([
      this.sosAlertRepository.getStatistics(),
      this.locationHistoryRepository.getStatistics(),
      getRealTimeService().getActiveGuardsFromDB(),
    ]);

    // Transform active guards map to array
    const guardsArray = Array.from(activeGuards.values());

    res.json({
      success: true,
      data: {
        sos: sosStats,
        location: locationStats,
        activeGuards: {
          count: guardsArray.length,
          guards: guardsArray,
        },
      },
    });
  });

  /**
   * GET /api/v1/dashboard/guards/:id/locations?limit=100
   * Get location history for a guard
   */
  getGuardLocationHistory = asyncHandler(async (req: Request, res: Response) => {
    const guardId = parseInt(req.params.id);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const locations = await this.locationHistoryRepository.findByGuardId(guardId, {
      limit,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: locations,
      count: locations.length,
    });
  });

  /**
   * GET /api/v1/dashboard/patrols/:id/path
   * Get patrol path (location history for a patrol run)
   */
  getPatrolPath = asyncHandler(async (req: Request, res: Response) => {
    const patrolRunId = parseInt(req.params.id);

    const locations = await this.locationHistoryRepository.findByPatrolRunId(patrolRunId);

    // Calculate path statistics
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1].location;
      const curr = locations[i].location;
      totalDistance += this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }

    res.json({
      success: true,
      data: {
        locations,
        statistics: {
          totalPoints: locations.length,
          totalDistance, // meters
          startTime: locations[0]?.receivedAt,
          endTime: locations[locations.length - 1]?.receivedAt,
        },
      },
    });
  });

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export default new WebRealTimeController();
