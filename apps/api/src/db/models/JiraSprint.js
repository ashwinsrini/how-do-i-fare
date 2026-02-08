import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const JiraSprint = sequelize.define('JiraSprint', {
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
    jiraSprintId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'jira_sprints',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['projectId', 'jiraSprintId'] },
    ],
  });

  return JiraSprint;
};
