'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
      Order.belongsTo(models.Customer, {
        foreignKey: 'customerPhone',
        targetKey: 'phone',
        as: 'customer'
      });
      Order.belongsTo(models.DeliveryBoy, {
        foreignKey: 'deliveryBoyId',
        as: 'deliveryBoy'
      });
    }
  }
  Order.init({
    customerPhone: DataTypes.STRING,
    address: DataTypes.TEXT,
    items: DataTypes.JSONB,
    total: DataTypes.FLOAT,
    status: DataTypes.STRING,
    branchId: DataTypes.INTEGER,
    cancellationReason: DataTypes.STRING,
    paymentMethod: DataTypes.STRING,
    paymentStatus: DataTypes.STRING,
    discountAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    appliedOfferCode: DataTypes.STRING,
    paymentTransactionId: DataTypes.STRING,
    formattedAddress: DataTypes.TEXT,
    deliveryBoyId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    deliveryLatitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    deliveryLongitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    gstRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    gstAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    subtotalBeforeTax: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};
