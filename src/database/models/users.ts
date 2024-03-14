import { Sequelize, DataTypes, Model } from 'sequelize';

export class LeveledUser extends Model {
    user_id!: string;
    xp!: number;
    lvl!: number;
    lastMessageTimestamp?: number;
}

export const obj = {
    get: (sequelize: Sequelize) => {
        return LeveledUser.init({
            user_id: {
                type: DataTypes.STRING,
                primaryKey: true,
            },
            xp: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            lvl: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            lastMessageTimestamp: {
                type: DataTypes.INTEGER,
                allowNull: true
            }
        }, {
            timestamps: false,
            sequelize
        });
    }
}

export default obj;
