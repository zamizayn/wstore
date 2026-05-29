'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SubscriptionPlans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      durationDays: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      features: {
        type: Sequelize.JSONB
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.bulkInsert('SubscriptionPlans', [
      {
        name: 'Free Trial',
        description: '14-day free trial with full access to all features.',
        price: 0,
        durationDays: 14,
        features: JSON.stringify({
          maxProducts: 50,
          maxOrders: 100,
          maxBranches: 1,
          hasAnalytics: true,
          hasOffers: true,
          hasNotifications: true,
          hasWhatsAppCatalog: true,
          supportLevel: 'email'
        }),
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Starter Monthly',
        description: 'Perfect for small businesses getting started with WhatsApp commerce.',
        price: 999,
        durationDays: 30,
        features: JSON.stringify({
          maxProducts: 200,
          maxOrders: 1000,
          maxBranches: 2,
          hasAnalytics: true,
          hasOffers: true,
          hasNotifications: true,
          hasWhatsAppCatalog: true,
          supportLevel: 'email'
        }),
        isActive: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Pro Monthly',
        description: 'For growing businesses with advanced needs and priority support.',
        price: 2499,
        durationDays: 30,
        features: JSON.stringify({
          maxProducts: -1,
          maxOrders: -1,
          maxBranches: 10,
          hasAnalytics: true,
          hasOffers: true,
          hasNotifications: true,
          hasWhatsAppCatalog: true,
          hasAISupport: true,
          supportLevel: 'priority'
        }),
        isActive: true,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Enterprise Yearly',
        description: 'Unlimited everything with dedicated support and custom integrations.',
        price: 19999,
        durationDays: 365,
        features: JSON.stringify({
          maxProducts: -1,
          maxOrders: -1,
          maxBranches: -1,
          hasAnalytics: true,
          hasOffers: true,
          hasNotifications: true,
          hasWhatsAppCatalog: true,
          hasAISupport: true,
          supportLevel: 'dedicated'
        }),
        isActive: true,
        sortOrder: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SubscriptionPlans');
  }
};
