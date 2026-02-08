import { Sequelize } from 'sequelize';
import { config } from '../config.js';

const logging = config.nodeEnv === 'production' ? false : (sql) => console.log(`[sql] ${sql}`);

const sequelize = config.db.url
  ? new Sequelize(config.db.url, {
      dialect: 'postgres',
      logging,
    })
  : new Sequelize(config.db.name, config.db.user, config.db.password, {
      host: config.db.host,
      port: config.db.port,
      dialect: 'postgres',
      logging,
    });

export { sequelize };
