import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const CredentialGithubOrg = sequelize.define('CredentialGithubOrg', {
    credentialId: {
      type: DataTypes.STRING(30),
      allowNull: false,
      references: { model: 'github_credentials', key: 'id' },
      onDelete: 'CASCADE',
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'github_organizations', key: 'id' },
      onDelete: 'CASCADE',
      primaryKey: true,
    },
  }, {
    tableName: 'credential_github_orgs',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['credentialId', 'organizationId'] },
    ],
  });

  return CredentialGithubOrg;
};
