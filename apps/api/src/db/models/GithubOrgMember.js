import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const GithubOrgMember = sequelize.define('GithubOrgMember', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'github_organizations', key: 'id' },
      onDelete: 'CASCADE',
    },
    githubUserId: {
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
  }, {
    tableName: 'github_org_members',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['organizationId', 'githubUserId'] },
    ],
  });

  return GithubOrgMember;
};
