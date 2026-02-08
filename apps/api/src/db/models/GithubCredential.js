import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const GithubCredential = sequelize.define('GithubCredential', {
    id: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      defaultValue: () => `gcred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pat: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'github_credentials',
    timestamps: true,
  });

  return GithubCredential;
};
