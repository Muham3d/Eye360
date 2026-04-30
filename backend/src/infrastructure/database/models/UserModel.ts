import { DataTypes, Model } from 'sequelize';
import { UserStatus } from '../../../core/domain/entities/User.js';
import { applyTenantScope } from '../hooks/TenantHook.js';

export class UserModel extends Model {
    public id!: number;
    public tenant_id!: string;
    public email!: string;
    public password_hash!: string;
    public first_name!: string;
    public last_name!: string;
    public role_id!: number;
    public status!: UserStatus;
    public account_locked_until!: Date | null;
    public failed_login_attempts!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export const initUserModel = (sequelize: any) => {
    UserModel.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            tenant_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: { isEmail: true },
            },
            password_hash: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            first_name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            last_name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            role_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM(...Object.values(UserStatus)),
                allowNull: false,
                defaultValue: UserStatus.PENDING,
            },
            account_locked_until: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            failed_login_attempts: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
        },
        {
            sequelize,
            tableName: 'users',
            underscored: true,
        }
    );

    applyTenantScope(UserModel);
};
