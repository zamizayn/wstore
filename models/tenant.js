'use strict';
const bcrypt = require('bcrypt');
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tenant extends Model {
    static associate(models) {
      Tenant.hasMany(models.Branch, { foreignKey: 'tenantId' });
      Tenant.belongsTo(models.SubscriptionPlan, { foreignKey: 'subscriptionPlanId' });
      Tenant.hasMany(models.SubscriptionHistory, { foreignKey: 'tenantId' });
    }
  }
  Tenant.init({
    name: DataTypes.STRING,
    phoneNumberId: DataTypes.STRING,
    whatsappToken: DataTypes.TEXT,
    wabaId: DataTypes.STRING,
    verifyToken: DataTypes.STRING,
    onboardingStep: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true
    },
    password: {
      type: DataTypes.STRING
    },
    webhooksEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    catalogId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    displayMode: {
      type: DataTypes.STRING,
      defaultValue: 'catalog'
    },
    razorpayKeyId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    razorpayKeySecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    razorpayWebhookSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    whatsappSettings: {
      type: DataTypes.JSON,
      allowNull: true
    },
    googleMapsApiKey: {
      type: DataTypes.STRING,
      allowNull: true
    },
    geminiApiKey: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contactName: DataTypes.STRING,
    contactPhone: DataTypes.STRING,
    contactEmail: DataTypes.STRING,
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid'),
      defaultValue: 'pending'
    },
    registrationPaymentId: DataTypes.STRING,
    subscriptionPlanId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    subscriptionStart: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subscriptionEnd: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('trialing', 'active', 'expired', 'cancelled'),
      defaultValue: 'trialing'
    },
    subscriptionPaymentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    trialStartDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    productUsageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Tenant',
    hooks: {
      beforeSave: async (tenant) => {
        if (tenant.changed('password')) {
          tenant.password = await bcrypt.hash(tenant.password, 10);
        }
      }
    }
  });
  return Tenant;
};