'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashPassword = async (password) => {
      if (!password || password.startsWith('$2b$') || password.startsWith('$2a$')) return password;
      return bcrypt.hash(password, 10);
    };

    // Hash Admin passwords
    const admins = await queryInterface.sequelize.query(
      `SELECT id, password FROM "Admins"`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (const admin of admins) {
      const hashed = await hashPassword(admin.password);
      if (hashed !== admin.password) {
        await queryInterface.sequelize.query(
          `UPDATE "Admins" SET password = :password WHERE id = :id`,
          { replacements: { password: hashed, id: admin.id } }
        );
      }
    }

    // Hash Tenant passwords
    const tenants = await queryInterface.sequelize.query(
      `SELECT id, password FROM "Tenants"`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (const tenant of tenants) {
      const hashed = await hashPassword(tenant.password);
      if (hashed !== tenant.password) {
        await queryInterface.sequelize.query(
          `UPDATE "Tenants" SET password = :password WHERE id = :id`,
          { replacements: { password: hashed, id: tenant.id } }
        );
      }
    }

    // Hash Branch passwords
    const branches = await queryInterface.sequelize.query(
      `SELECT id, password FROM "Branches"`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (const branch of branches) {
      const hashed = await hashPassword(branch.password);
      if (hashed !== branch.password) {
        await queryInterface.sequelize.query(
          `UPDATE "Branches" SET password = :password WHERE id = :id`,
          { replacements: { password: hashed, id: branch.id } }
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // No safe way to reverse hashing
  }
};
