import { User } from '../../../core/domain/entities/User.js';
import type { IUserRepository } from '../../../core/domain/repositories/IUserRepository.js';
import { UserModel } from '../models/UserModel.js';

export class UserRepository implements IUserRepository {
    private mapToDomain(model: UserModel): User {
        return new User(
            model.id,
            model.tenant_id,
            model.email,
            model.password_hash,
            model.first_name,
            model.last_name,
            model.role_id,
            model.status,
            model.account_locked_until || undefined,
            model.failed_login_attempts,
            model.createdAt,
            model.updatedAt
        );
    }

    async findById(id: number): Promise<User | null> {
        const model = await UserModel.findByPk(id);
        return model ? this.mapToDomain(model) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const model = await UserModel.findOne({ where: { email } });
        return model ? this.mapToDomain(model) : null;
    }

    async findAll(filter?: any): Promise<User[]> {
        const models = await UserModel.findAll({ where: filter });
        return models.map(this.mapToDomain);
    }

    async create(user: User): Promise<User> {
        const model = await UserModel.create({
            tenant_id: user.tenantId,
            email: user.email,
            password_hash: user.passwordHash,
            first_name: user.firstName,
            last_name: user.lastName,
            role_id: user.roleId,
            status: user.status,
        });
        return this.mapToDomain(model);
    }

    async update(id: number, data: Partial<User>): Promise<boolean> {
        const [affectedCount] = await UserModel.update(
            {
                email: data.email,
                password_hash: data.passwordHash,
                first_name: data.firstName,
                last_name: data.lastName,
                role_id: data.roleId,
                status: data.status,
                account_locked_until: data.accountLockedUntil,
                failed_login_attempts: data.failedLoginAttempts,
            },
            { where: { id } }
        );
        return affectedCount > 0;
    }

    async delete(id: number): Promise<boolean> {
        const affectedCount = await UserModel.destroy({ where: { id } });
        return affectedCount > 0;
    }

    async incrementFailedLoginAttempts(id: number): Promise<void> {
        await UserModel.increment('failed_login_attempts', { where: { id } });
    }

    async resetFailedLoginAttempts(id: number): Promise<void> {
        await UserModel.update({ failed_login_attempts: 0 }, { where: { id } });
    }

    async lockAccount(id: number, lockUntil: Date): Promise<void> {
        await UserModel.update({ account_locked_until: lockUntil }, { where: { id } });
    }
}
