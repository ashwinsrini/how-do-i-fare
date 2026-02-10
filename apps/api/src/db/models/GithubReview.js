import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const GithubReview = sequelize.define('GithubReview', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    pullRequestId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'github_pull_requests', key: 'id' },
      onDelete: 'CASCADE',
    },
    githubReviewId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    reviewerLogin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reviewerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reviewerId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    reviewerAvatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    state: {
      type: DataTypes.ENUM('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED'),
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'github_reviews',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['githubReviewId'] },
      { fields: ['reviewerLogin'] },
      { fields: ['submittedAt'] },
    ],
  });

  return GithubReview;
};
