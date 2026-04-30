export enum TenantStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    INACTIVE = 'inactive',
}

export class Tenant {
    constructor(
        public readonly id: string,
        public name: string,
        public domain: string,
        public status: TenantStatus = TenantStatus.ACTIVE,
        public readonly createdAt?: Date,
        public readonly updatedAt?: Date
    ) { }

    public static create(props: { name: string; domain: string; id?: string }) {
        // Basic validation could go here
        return new Tenant(
            props.id || crypto.randomUUID(),
            props.name,
            props.domain,
            TenantStatus.ACTIVE
        );
    }
}
