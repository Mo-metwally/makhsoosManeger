module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_AttendanceLogs_status" ADD VALUE IF NOT EXISTS 'BusinessTrip';
      `);
      console.log("Added BusinessTrip to enum_AttendanceLogs_status successfully.");
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log("BusinessTrip already exists in enum.");
      } else {
        throw error;
      }
    }
  },
  
  down: async (queryInterface, Sequelize) => {
    // PostgreSQL does not support removing ENUM values easily.
    console.log("Cannot easily remove ENUM value in PostgreSQL.");
  }
};
