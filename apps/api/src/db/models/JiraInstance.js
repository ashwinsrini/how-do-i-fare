import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const JiraInstance = sequelize.define('JiraInstance', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    tableName: 'jira_instances',
    timestamps: true,
  });

  return JiraInstance;
};
