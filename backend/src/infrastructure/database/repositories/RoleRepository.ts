import { Role } from '../../../core/domain/entities/Role.js';
import type { IRoleRepository } from '../../../core/domain/repositories/IRoleRepository.js';
import { RoleModel } from '../models/RoleModel.js';

export class RoleRepository implements IRoleRepository {
    private mapToDomain(model: RoleModel): Role {
        return new Role(model.id, model.name, model.permissions);
    }

    async findById(id: number): Promise<Role | null> {
        const model = await RoleModel.findByPk(id);
        return model ? this.mapToDomain(model) : null;
    }

    async findByName(name: any): Promise<Role | null> {
        const model = await RoleModel.findOne({ where: { name } });
        return model ? this.mapToDomain(model) : null;
    }

    async findAll(): Promise<Role[]> {
        const models = await RoleModel.findAll();
        return models.map(this.mapToDomain);
    }

    async create(role: Role): Promise<Role> {
        const model = await RoleModel.create({
            name: role.name,
            permissions: role.permissions,
        });
        return this.mapToDomain(model);
    }

    async update(id: number, data: Partial<Role>): Promise<boolean> {
        const [affectedCount] = await RoleModel.update(
            { name: data.name, permissions: data.permissions },
            { where: { id } }
        );
        return affectedCount > 0;
    }

    async delete(id: number): Promise<boolean> {
        const affectedCount = await RoleModel.destroy({ where: { id } });
        return affectedCount > 0;
    }
}
