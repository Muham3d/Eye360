import { getTenantId } from '../TenantContext.js';

export const applyTenantScope = (model: any) => {
    model.addHook('beforeFind', (options: any) => {
        const tenantId = getTenantId();
        if (tenantId) {
            options.where = {
                ...options.where,
                tenant_id: tenantId,
            };
        }
    });

    model.addHook('beforeCreate', (instance: any) => {
        const tenantId = getTenantId();
        if (tenantId && !instance.tenant_id) {
            instance.tenant_id = tenantId;
        }
    });

    // Also beforeUpdate if we want to prevent updating tenant_id or ensure it stays the same
};
