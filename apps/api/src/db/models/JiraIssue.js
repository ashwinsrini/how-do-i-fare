import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const JiraIssue = sequelize.define('JiraIssue', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    projectId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'jira_projects', key: 'id' },
      onDelete: 'CASCADE',
    },
    sprintId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'jira_sprints', key: 'id' },
      onDelete: 'SET NULL',
    },
    jiraIssueId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    issueType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    statusCategory: {
      type: DataTypes.ENUM('new', 'indeterminate', 'done'),
      allowNull: true,
    },
    priority: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    storyPoints: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    assigneeName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assigneeAccountId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assigneeAvatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reporterName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolvedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'jira_issues',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['projectId', 'jiraIssueId'] },
      { fields: ['projectId', 'assigneeAccountId'] },
      { fields: ['projectId', 'status'] },
      { fields: ['projectId', 'issueType'] },
      { fields: ['createdDate'] },
      { fields: ['resolvedDate'] },
    ],
  });

  return JiraIssue;
};
