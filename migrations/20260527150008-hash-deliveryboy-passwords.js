'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashPassword = async (password) => {
      if (!password || password.startsWith('$2b$') || password.startsWith('$2a$')) return password;
      return bcrypt.hash(password, 10);
    };

    const boys = await queryInterface.sequelize.query(
      `SELECT id, password FROM "DeliveryBoys"`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const boy of boys) {
      const hashed = await hashPassword(boy.password);
      if (hashed !== boy.password) {
        await queryInterface.sequelize.query(
          `UPDATE "DeliveryBoys" SET password = :password WHERE id = :id`,
          { replacements: { password: hashed, id: boy.id } }
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
  }
};
