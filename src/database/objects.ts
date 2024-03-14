import { Sequelize } from 'sequelize';

const auth = {
    uname: process.env.SQLITE_UNAME as string,
    pwd: process.env.SQLITE_PWD as string
}

const sequelize = new Sequelize('database', auth.uname, auth.pwd, {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'database/database.sqlite'
});

const modelUsers = await import('./models/users.js');
export const dbUsers = modelUsers.obj.get(sequelize);
