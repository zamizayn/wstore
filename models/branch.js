'use strict';
const bcrypt = require('bcrypt');
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Branch extends Model {
    static associate(models) {
      Branch.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
      Branch.hasMany(models.Category, { foreignKey: 'branchId' });
      Branch.hasMany(models.Product, { foreignKey: 'branchId' });
      Branch.hasMany(models.Order, { foreignKey: 'branchId' });
      Branch.hasMany(models.Customer, { foreignKey: 'branchId' });
      Branch.hasMany(models.Offer, { foreignKey: 'branchId' });
      Branch.hasMany(models.DeliveryBoy, { foreignKey: 'branchId', as: 'deliveryBoys' });
    }
  }
  Branch.init({
    name: DataTypes.STRING,
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    tenantId: DataTypes.INTEGER,
    openingTime: DataTypes.STRING,
    closingTime: DataTypes.STRING,
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    deliveryRadius: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Branch',
    hooks: {
      beforeSave: async (branch) => {
        if (branch.changed('password')) {
          branch.password = await bcrypt.hash(branch.password, 10);
        }
      }
    }
  });
  return Branch;
};
