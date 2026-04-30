export enum UserRole {
    ADMIN = 'Admin',
    MANAGER = 'Manager',
    SUPERVISOR = 'Supervisor',
    GUARD = 'Guard',
}

export class Role {
    constructor(
        public readonly id: number,
        public readonly name: UserRole,
        public readonly permissions: string[]
    ) { }

    public static create(props: { id: number; name: UserRole; permissions: string[] }) {
        return new Role(props.id, props.name, props.permissions);
    }
}
