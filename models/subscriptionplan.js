'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubscriptionPlan extends Model {
    static associate(models) {
      SubscriptionPlan.hasMany(models.Tenant, { foreignKey: 'subscriptionPlanId' });
      SubscriptionPlan.hasMany(models.SubscriptionHistory, { foreignKey: 'subscriptionPlanId' });
    }
  }
  SubscriptionPlan.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    durationDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    productLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50
    },
    features: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'SubscriptionPlan',
    tableName: 'SubscriptionPlans'
  });
  return SubscriptionPlan;
};