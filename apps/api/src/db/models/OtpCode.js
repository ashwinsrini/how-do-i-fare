import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const OtpCode = sequelize.define('OtpCode', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    failedAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  }, {
    tableName: 'otp_codes',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['email'] },
    ],
  });

  return OtpCode;
};
