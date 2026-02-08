import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const CredentialJiraProject = sequelize.define('CredentialJiraProject', {
    credentialId: {
      type: DataTypes.STRING(30),
      allowNull: false,
      references: { model: 'jira_credentials', key: 'id' },
      onDelete: 'CASCADE',
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'jira_projects', key: 'id' },
      onDelete: 'CASCADE',
      primaryKey: true,
    },
  }, {
    tableName: 'credential_jira_projects',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['credentialId', 'projectId'] },
    ],
  });

  return CredentialJiraProject;
};
