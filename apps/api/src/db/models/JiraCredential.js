import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const JiraCredential = sequelize.define('JiraCredential', {
    id: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      defaultValue: () => `jcred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    apiToken: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    storyPointsFieldId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sprintFieldId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'jira_credentials',
    timestamps: true,
  });

  return JiraCredential;
};
