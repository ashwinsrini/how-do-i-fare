import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const GithubRepository = sequelize.define('GithubRepository', {
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
    githubRepoId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    defaultBranch: {
      type: DataTypes.STRING,
      defaultValue: 'main',
    },
  }, {
    tableName: 'github_repositories',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['githubRepoId'] },
    ],
  });

  return GithubRepository;
};
