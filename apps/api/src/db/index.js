import { Sequelize } from 'sequelize';
import { config } from '../config.js';

const logSql = (sql) => console.log(`[sql] ${sql}`);

const sequelize = config.db.url
  ? new Sequelize(config.db.url, {
      dialect: 'postgres',
      logging: logSql,
    })
  : new Sequelize(config.db.name, config.db.user, config.db.password, {
      host: config.db.host,
      port: config.db.port,
      dialect: 'postgres',
      logging: logSql,
    });

export { sequelize };
