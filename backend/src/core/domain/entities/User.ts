export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    PENDING = 'pending',
}

export class User {
    constructor(
        public readonly id: number,
        public readonly tenantId: string,
        public readonly email: string,
        public readonly passwordHash: string,
        public readonly firstName: string,
        public readonly lastName: string,
        public readonly roleId: number,
        public status: UserStatus = UserStatus.PENDING,
        public readonly accountLockedUntil?: Date,
        public readonly failedLoginAttempts: number = 0,
        public readonly createdAt?: Date,
        public readonly updatedAt?: Date
    ) { }
}
