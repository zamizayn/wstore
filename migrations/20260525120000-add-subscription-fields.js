'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('SubscriptionPlans', 'productLimit', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 50
    });

    await queryInterface.addColumn('Tenants', 'trialStartDate', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Tenants', 'productUsageCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('SubscriptionPlans', 'productLimit');
    await queryInterface.removeColumn('Tenants', 'trialStartDate');
    await queryInterface.removeColumn('Tenants', 'productUsageCount');
  }
};