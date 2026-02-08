import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const TeamMember = sequelize.define('TeamMember', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    jiraAccountId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    jiraDisplayName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    githubLogin: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    githubUserId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: true,
    },
  }, {
    tableName: 'team_members',
    timestamps: true,
  });

  return TeamMember;
};
