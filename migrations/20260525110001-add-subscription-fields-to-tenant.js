'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tenants', 'subscriptionPlanId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'SubscriptionPlans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Tenants', 'subscriptionStart', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Tenants', 'subscriptionEnd', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Tenants', 'subscriptionStatus', {
      type: Sequelize.ENUM('trialing', 'active', 'expired', 'cancelled'),
      defaultValue: 'trialing'
    });

    await queryInterface.addColumn('Tenants', 'subscriptionPaymentId', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Set existing tenants to trialing with a 14-day trial from now
    await queryInterface.sequelize.query(
      `UPDATE "Tenants" SET "subscriptionStatus" = 'trialing', "subscriptionStart" = NOW(), "subscriptionEnd" = NOW() + INTERVAL '14 days' WHERE "subscriptionStatus" IS NULL`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Tenants', 'subscriptionPlanId');
    await queryInterface.removeColumn('Tenants', 'subscriptionStart');
    await queryInterface.removeColumn('Tenants', 'subscriptionEnd');
    await queryInterface.removeColumn('Tenants', 'subscriptionStatus');
    await queryInterface.removeColumn('Tenants', 'subscriptionPaymentId');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Tenants_subscriptionStatus"');
  }
};
