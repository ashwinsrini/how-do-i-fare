import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const AppSetting = sequelize.define('AppSetting', {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'app_settings',
    timestamps: true,
  });

  return AppSetting;
};
