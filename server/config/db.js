const { Sequelize } = require('sequelize');

// Using PostgreSQL instead of SQLite
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;
