/**
 * Patrol Template Domain Entity
 *
 * Defines a reusable patrol route with sequenced checkpoints.
 * Templates are used to create scheduled patrol runs.
 *
 * @module core/domain/entities
 */

/**
 * Patrol Template Status Enum
 */
export enum PatrolTemplateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

/**
 * Minimum Role Level Enum
 * Minimum role required to execute this patrol
 */
export enum RequiredRoleLevel {
  GUARD = 'guard',
  SUPERVISOR = 'supervisor',
  MANAGER = 'manager',
}

/**
 * Patrol Template Domain Entity
 */
export interface IPatrolTemplate {
  id: number;
  siteId: number;
  name: string;
  description?: string;
  estimatedDuration: number; // minutes
  maxCompletionTime: number; // minutes
  requiredRole: RequiredRoleLevel;
  status: PatrolTemplateStatus;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Patrol Template Creation DTO
 */
export interface ICreatePatrolTemplateDTO {
  siteId: number;
  name: string;
  description?: string;
  estimatedDuration: number;
  maxCompletionTime: number;
  requiredRole?: RequiredRoleLevel;
  status?: PatrolTemplateStatus;
  createdById: number;
}

/**
 * Patrol Template Update DTO
 */
export interface IUpdatePatrolTemplateDTO {
  name?: string;
  description?: string;
  estimatedDuration?: number;
  maxCompletionTime?: number;
  requiredRole?: RequiredRoleLevel;
  status?: PatrolTemplateStatus;
}

/**
 * Patrol Template Query Options
 */
export interface IPatrolTemplateQueryOptions {
  siteId?: number;
  status?: PatrolTemplateStatus;
  requiredRole?: RequiredRoleLevel;
  createdById?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Patrol Template Detail
 * Template with associated checkpoints
 */
export interface IPatrolTemplateDetail extends IPatrolTemplate {
  checkpoints: IPatrolCheckpoint[];
  totalPointsValue: number;
}

/**
 * Import from Checkpoint entity
 */
import { IPatrolCheckpoint } from './PatrolCheckpoint.js';
