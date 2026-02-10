import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SyncJob = sequelize.define('SyncJob', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM('jira', 'github'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending',
    },
    queueJobId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    jiraCredentialId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      references: { model: 'jira_credentials', key: 'id' },
      onDelete: 'SET NULL',
    },
    githubCredentialId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      references: { model: 'github_credentials', key: 'id' },
      onDelete: 'SET NULL',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    totalItems: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    processedItems: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    currentPhase: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    triggeredBy: {
      type: DataTypes.ENUM('manual', 'scheduled'),
      defaultValue: 'manual',
    },
  }, {
    tableName: 'sync_jobs',
    timestamps: true,
    indexes: [
      { fields: ['type', 'status'] },
      { fields: ['createdAt'] },
    ],
  });

  return SyncJob;
};
