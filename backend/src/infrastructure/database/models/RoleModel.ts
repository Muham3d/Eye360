import { DataTypes, Model } from 'sequelize';
import { UserRole } from '../../../core/domain/entities/Role.js';

export class RoleModel extends Model {
    public id!: number;
    public name!: UserRole;
    public permissions!: string[];
}

export const initRoleModel = (sequelize: any) => {
    RoleModel.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: DataTypes.ENUM(...Object.values(UserRole)),
                allowNull: false,
                unique: true,
            },
            permissions: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
            },
        },
        {
            sequelize,
            tableName: 'roles',
            timestamps: false,
        }
    );
};
