/**
 * Tenant Context Middleware
 *
 * Scopes database queries by tenant ID using request-scoped AsyncLocalStorage.
 *
 * @module interfaces/http/middleware
 */

import { Response, NextFunction } from 'express';
import { runWithTenant } from '../../../infrastructure/database/TenantContext.js';
import type { AuthenticatedRequest } from './authMiddleware.js';

/**
 * Middleware to scope request context with a tenant ID
 */
export function tenantMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Extract tenant ID from authenticated token payload, custom header, or default fallback
  const headerTenantId = req.header('x-tenant-id') || req.header('X-Tenant-ID');
  const userTenantId = (req.user as any)?.tenantId;
  
  const tenantId = userTenantId || headerTenantId || 'default-tenant';

  // Run subsequent request handlers within the tenant context scope
  runWithTenant(tenantId, () => {
    next();
  });
}

export default tenantMiddleware;
