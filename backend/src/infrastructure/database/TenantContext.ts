import { AsyncLocalStorage } from 'async_hooks';

const tenantContext = new AsyncLocalStorage<string>();

export const getTenantId = () => tenantContext.getStore();
export const runWithTenant = (tenantId: string, callback: () => any) =>
    tenantContext.run(tenantId, callback);
