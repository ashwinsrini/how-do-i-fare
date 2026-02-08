import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const JiraProject = sequelize.define('JiraProject', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    instanceId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'jira_instances', key: 'id' },
      onDelete: 'CASCADE',
    },
    jiraProjectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    syncLockedBy: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    syncLockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'jira_projects',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['instanceId', 'jiraProjectId'] },
    ],
  });

  return JiraProject;
};
