import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const GithubPullRequest = sequelize.define('GithubPullRequest', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    repositoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'github_repositories', key: 'id' },
      onDelete: 'CASCADE',
    },
    githubPrId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    merged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    draft: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    authorLogin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    authorId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    authorAvatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    linesAdded: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    linesDeleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    changedFiles: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    createdAtGh: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAtGh: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    mergedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'github_pull_requests',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['githubPrId'] },
      { fields: ['repositoryId', 'authorLogin'] },
      { fields: ['createdAtGh'] },
      { fields: ['mergedAt'] },
    ],
  });

  return GithubPullRequest;
};
