import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const GithubOrganization = sequelize.define('GithubOrganization', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    githubOrgId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    login: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isPersonal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    tableName: 'github_organizations',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['githubOrgId'] },
    ],
  });

  return GithubOrganization;
};
