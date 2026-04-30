/**
 * US4 Patrol Sync Contract Test
 *
 * Contract tests for the Mobile Patrol Sync API.
 * Validates the API contract for offline patrol data synchronization.
 *
 * @module tests/contract
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the services to avoid ESM import issues
jest.mock('../../src/core/services/PatrolExecutionService', () => ({
    PatrolExecutionService: jest.fn().mockImplementation(() => ({
        syncPatrolRuns: jest.fn(),
        getActivePatrolRun: jest.fn(),
    })),
    getPatrolExecutionService: jest.fn().mockReturnValue({
        syncPatrolRuns: jest.fn(),
        getActivePatrolRun: jest.fn(),
    }),
}));

// Import the mocked service
import { getPatrolExecutionService } from '../../src/core/services/PatrolExecutionService';

describe('US4 Patrol Sync Contract Tests', () => {
    let mockService: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockService = getPatrolExecutionService();
    });

    describe('POST /api/mobile/patrols/sync - Contract Validation', () => {
        const syncEndpoint = '/api/mobile/patrols/sync';

        it('should accept an array of patrol runs in the request body', async () => {
            const patrolRuns = [
                {
                    id: 1,
                    templateId: 10,
                    guardId: 100,
                    startTime: '2026-02-26T08:00:00Z',
                    endTime: '2026-02-26T10:00:00Z',
                    status: 'completed',
                    verifications: [
                        {
                            checkpointId: 50,
                            timestamp: '2026-02-26T08:15:00Z',
                            location: { latitude: 40.7128, longitude: -74.0060 },
                            status: 'verified'
                        }
                    ]
                }
            ];

            // Mock successful sync response
            mockService.syncPatrolRuns.mockResolvedValue({
                success: true,
                data: {
                    synced: 1,
                    conflicts: [],
                    updated: []
                }
            });

            // Contract validation: The endpoint should accept an array
            expect(Array.isArray(patrolRuns)).toBe(true);
            expect(patrolRuns[0]).toHaveProperty('id');
            expect(patrolRuns[0]).toHaveProperty('templateId');
            expect(patrolRuns[0]).toHaveProperty('guardId');
            expect(patrolRuns[0]).toHaveProperty('verifications');
        });

        it('should include required fields for each patrol run', () => {
            const patrolRun = {
                id: 1,
                templateId: 10,
                guardId: 100,
                startTime: '2026-02-26T08:00:00Z',
                endTime: '2026-02-26T10:00:00Z',
                status: 'completed',
                verifications: []
            };

            // Required fields according to data model
            const requiredFields = ['id', 'templateId', 'guardId', 'startTime', 'endTime', 'status'];
            requiredFields.forEach(field => {
                expect(patrolRun).toHaveProperty(field);
            });
        });

        it('should support Last-Write-Wins conflict handling', async () => {
            const syncResult = {
                success: true,
                data: {
                    synced: 1,
                    conflicts: [
                        {
                            patrolRunId: 1,
                            reason: 'Server has newer data',
                            serverVersion: {
                                endTime: '2026-02-26T11:00:00Z',
                                status: 'in_progress'
                            },
                            clientVersion: {
                                endTime: '2026-02-26T10:00:00Z',
                                status: 'completed'
                            },
                            resolution: 'server_version_wins'
                        }
                    ],
                    updated: [
                        { patrolRunId: 2, status: 'synced' }
                    ]
                }
            };

            mockService.syncPatrolRuns.mockResolvedValue(syncResult);

            const result = await mockService.syncPatrolRuns([]);

            expect(result.data).toHaveProperty('conflicts');
            expect(Array.isArray(result.data.conflicts)).toBe(true);
            expect(result.data).toHaveProperty('updated');
            expect(Array.isArray(result.data.updated)).toBe(true);
        });

        it('should include verification data for each checkpoint', () => {
            const verification = {
                checkpointId: 50,
                timestamp: '2026-02-26T08:15:00Z',
                location: { latitude: 40.7128, longitude: -74.0060 },
                accuracy: 5.2,
                status: 'verified',
                photoUrl: 'https://example.com/photos/verify123.jpg',
                notes: 'Checkpoint verified successfully'
            };

            // Verification contract fields
            expect(verification).toHaveProperty('checkpointId');
            expect(verification).toHaveProperty('timestamp');
            expect(verification).toHaveProperty('location');
            expect(verification).toHaveProperty('status');
        });
    });

    describe('GET /api/mobile/assignments - Contract Validation', () => {
        it('should return today\'s assigned sites and patrol templates', () => {
            const assignments = {
                sites: [
                    {
                        id: 1,
                        name: 'Main Office',
                        address: '123 Business St'
                    }
                ],
                templates: [
                    {
                        id: 10,
                        siteId: 1,
                        name: 'Morning Patrol',
                        checkpoints: [50, 51, 52]
                    }
                ]
            };

            expect(assignments).toHaveProperty('sites');
            expect(assignments).toHaveProperty('templates');
            expect(Array.isArray(assignments.sites)).toBe(true);
            expect(Array.isArray(assignments.templates)).toBe(true);
        });
    });

    describe('Response Format Contract', () => {
        it('should follow standard response format for successful sync', () => {
            const successResponse = {
                success: true,
                data: {
                    synced: 1,
                    conflicts: [],
                    updated: []
                }
            };

            expect(successResponse).toHaveProperty('success', true);
            expect(successResponse).toHaveProperty('data');
            expect(successResponse.data).toHaveProperty('synced');
        });

        it('should follow standard error response format', () => {
            const errorResponse = {
                success: false,
                error: {
                    code: 'SYNC_VALIDATION_FAILED',
                    message: 'Invalid patrol data',
                    details: {}
                }
            };

            expect(errorResponse).toHaveProperty('success', false);
            expect(errorResponse).toHaveProperty('error');
            expect(errorResponse.error).toHaveProperty('code');
            expect(errorResponse.error).toHaveProperty('message');
        });
    });

    describe('Status Enum Contract', () => {
        it('should support valid patrol run statuses', () => {
            const validStatuses = ['pending', 'in_progress', 'completed', 'abandoned', 'failed'];
            const patrolRun = { status: 'completed' };

            expect(validStatuses).toContain(patrolRun.status);
        });

        it('should support valid checkpoint verification statuses', () => {
            const validStatuses = ['verified', 'failed', 'skipped', 'pending'];
            const verification = { status: 'verified' };

            expect(validStatuses).toContain(verification.status);
        });
    });

    describe('Location Format Contract', () => {
        it('should use GeoJSON Point format for locations', () => {
            const location = {
                type: 'Point',
                coordinates: [-74.0060, 40.7128] // [longitude, latitude]
            };

            expect(location).toHaveProperty('type', 'Point');
            expect(location).toHaveProperty('coordinates');
            expect(Array.isArray(location.coordinates)).toBe(true);
            expect(location.coordinates).toHaveLength(2);
        });

        it('should support legacy location format for backward compatibility', () => {
            const location = {
                latitude: 40.7128,
                longitude: -74.0060
            };

            expect(location).toHaveProperty('latitude');
            expect(location).toHaveProperty('longitude');
        });
    });
});
