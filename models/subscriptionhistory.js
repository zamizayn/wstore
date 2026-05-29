'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubscriptionHistory extends Model {
    static associate(models) {
      SubscriptionHistory.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
      SubscriptionHistory.belongsTo(models.SubscriptionPlan, { foreignKey: 'subscriptionPlanId' });
    }
  }
  SubscriptionHistory.init({
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    subscriptionPlanId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    previousPlanId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    action: {
      type: DataTypes.ENUM('created', 'renewed', 'upgraded', 'downgraded', 'cancelled'),
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    proratedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SubscriptionHistory',
    tableName: 'SubscriptionHistories'
  });
  return SubscriptionHistory;
};