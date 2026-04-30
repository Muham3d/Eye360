import type { Role } from '../entities/Role.js';
import type { IBaseRepository } from './BaseRepository.js';

export interface IRoleRepository extends IBaseRepository<Role> {
    findByName(name: string): Promise<Role | null>;
}
