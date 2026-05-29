'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CustomerAddress extends Model {
    static associate(models) {
      CustomerAddress.belongsTo(models.Customer, {
        foreignKey: 'customerPhone',
        targetKey: 'phone',
        as: 'customer'
      });
    }
  }
  CustomerAddress.init({
    customerPhone: DataTypes.STRING,
    address: DataTypes.TEXT,
    formattedAddress: DataTypes.TEXT,
    label: DataTypes.STRING,
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'CustomerAddress',
  });
  return CustomerAddress;
};
